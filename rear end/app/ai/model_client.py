import base64
from dataclasses import dataclass
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.ai.chapter_generator import build_chapter_prompt
from app.ai.material_context import build_material_context
from app.entity.outline import ReportOutline
from app.entity.report import ReportRecord
from app.entity.system_config import SystemConfig


class LLMConfigError(ValueError):
    pass


class LLMCallError(RuntimeError):
    pass


@dataclass(frozen=True)
class LLMRuntimeConfig:
    api_url: str
    model_name: str
    api_key: str
    timeout_seconds: int


def load_generation_config(db: Session) -> LLMRuntimeConfig | None:
    item = _get_llm_config_item(db)
    if item is None:
        return None
    data = item.config_data or {}
    if not bool(data.get("enabled", item.is_active)):
        return None

    api_url = str(data.get("apiUrl") or "").strip()
    model_name = str(data.get("modelName") or "").strip()
    if _is_placeholder_url(api_url) or not model_name:
        return None
    if _looks_like_unsupported_deepseek_model(api_url, model_name):
        return None

    return LLMRuntimeConfig(
        api_url=api_url,
        model_name=model_name,
        api_key=_decode_api_key(data.get("apiKeyEncrypted")),
        timeout_seconds=_normalize_timeout(data.get("timeoutSeconds")),
    )


def load_required_config(db: Session) -> LLMRuntimeConfig:
    item = _get_llm_config_item(db)
    if item is None:
        raise LLMConfigError("请先保存模型配置")
    data = item.config_data or {}
    if not bool(data.get("enabled", item.is_active)):
        raise LLMConfigError("模型配置未启用")

    api_url = str(data.get("apiUrl") or "").strip()
    model_name = str(data.get("modelName") or "").strip()
    if not api_url or _is_placeholder_url(api_url):
        raise LLMConfigError("请填写真实的模型 API 地址")
    if not model_name:
        raise LLMConfigError("请填写模型名称")

    return LLMRuntimeConfig(
        api_url=api_url,
        model_name=model_name,
        api_key=_decode_api_key(data.get("apiKeyEncrypted")),
        timeout_seconds=_normalize_timeout(data.get("timeoutSeconds")),
    )


def generate_chapter_with_llm(
    db: Session,
    report: ReportRecord,
    chapter: ReportOutline,
    extra_prompt: str | None = None,
) -> str | None:
    config = load_generation_config(db)
    if config is None:
        return None

    material_context = build_material_context(db, report.major, report.material_ids or [])
    messages = [
        {
            "role": "system",
            "content": (
                "你是电力行业技术监督报告写作助手。"
                "请输出严谨、客观、可直接用于正式报告的中文正文，不编造具体数值。"
            ),
        },
        {
            "role": "user",
            "content": build_chapter_prompt(report, chapter, extra_prompt, material_context),
        },
    ]
    return call_chat_completion(config, messages)


def test_model_connection(db: Session) -> dict:
    config = load_required_config(db)
    reply = call_chat_completion(
        config,
        [
            {"role": "system", "content": "你只负责模型连接测试。"},
            {"role": "user", "content": "请只回复 pong"},
        ],
    )
    return {"modelName": config.model_name, "reply": reply[:120]}


def call_chat_completion(config: LLMRuntimeConfig, messages: list[dict[str, str]]) -> str:
    headers = {"Content-Type": "application/json"}
    if config.api_key:
        headers["Authorization"] = f"Bearer {config.api_key}"

    payload = {
        "model": config.model_name,
        "messages": messages,
        "temperature": 0.2,
        "stream": False,
    }
    try:
        timeout = httpx.Timeout(
            timeout=min(config.timeout_seconds, 6),
            connect=3,
            read=min(config.timeout_seconds, 6),
        )
        response = httpx.post(
            config.api_url,
            headers=headers,
            json=payload,
            timeout=timeout,
        )
    except httpx.TimeoutException as exc:
        raise LLMCallError("模型接口连接超时，请检查地址或超时时间") from exc
    except httpx.HTTPError as exc:
        raise LLMCallError(f"模型接口请求失败：{exc}") from exc

    if response.status_code >= 400:
        raise LLMCallError(_format_http_error(response))

    try:
        data = response.json()
    except ValueError as exc:
        raise LLMCallError("模型接口未返回 JSON 数据") from exc

    content = _extract_content(data)
    if not content:
        raise LLMCallError("模型接口未返回有效文本内容")
    return content.strip()


def _get_llm_config_item(db: Session) -> SystemConfig | None:
    return db.query(SystemConfig).filter(SystemConfig.config_type == "llm").first()


def _decode_api_key(encrypted: str | None) -> str:
    if not encrypted:
        return ""
    try:
        return base64.b64decode(encrypted.encode()).decode()
    except Exception:
        return ""


def _normalize_timeout(value: Any) -> int:
    try:
        timeout = int(value or 120)
    except (TypeError, ValueError):
        timeout = 120
    return max(5, min(timeout, 600))


def _is_placeholder_url(api_url: str) -> bool:
    normalized = api_url.lower()
    return not normalized or "api.example.com" in normalized


def _looks_like_unsupported_deepseek_model(api_url: str, model_name: str) -> bool:
    normalized_url = api_url.lower()
    normalized_model = model_name.lower().strip()
    if "api.deepseek.com" not in normalized_url:
        return False
    return normalized_model not in {"deepseek-chat", "deepseek-reasoner"}


def _extract_content(data: dict[str, Any]) -> str:
    choices = data.get("choices") or []
    if not choices:
        return ""
    first = choices[0] or {}
    message = first.get("message") or {}
    content = message.get("content") or first.get("text") or ""
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                parts.append(str(item.get("text") or item.get("content") or ""))
            else:
                parts.append(str(item))
        return "".join(parts)
    return str(content)


def _format_http_error(response: httpx.Response) -> str:
    detail = response.text[:300]
    try:
        data = response.json()
        error = data.get("error")
        if isinstance(error, dict):
            detail = str(error.get("message") or detail)
        elif isinstance(data.get("message"), str):
            detail = data["message"]
    except ValueError:
        pass
    return f"模型接口返回错误 {response.status_code}：{detail}"
