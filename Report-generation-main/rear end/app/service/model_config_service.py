import base64
import time

from sqlalchemy.orm import Session

from app.ai.model_client import LLMCallError, LLMConfigError, test_model_connection
from app.core.errors import BusinessError
from app.core.security import CurrentUser
from app.entity.system_config import SystemConfig
from app.utils.datetime_utils import isoformat
from app.utils.id_utils import to_external_id


class ModelConfigService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_config(self) -> dict:
        item = self._get_or_default()
        return self._item(item)

    def save_config(self, payload, user: CurrentUser) -> dict:
        item = self._get_or_default()
        data = dict(item.config_data or {})
        if payload.apiKey:
            data["apiKeyEncrypted"] = base64.b64encode(payload.apiKey.encode()).decode()
        data.update(
            {
                "apiUrl": payload.apiUrl,
                "modelName": payload.modelName,
                "timeoutSeconds": payload.timeoutSeconds,
                "enabled": payload.enabled,
            }
        )
        item.config_data = data
        item.is_active = payload.enabled
        item.updated_by = user.user_id
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self._item(item)

    def test_connection(self) -> dict:
        start = time.perf_counter()
        try:
            result = test_model_connection(self.db)
        except LLMConfigError as exc:
            raise BusinessError(400, str(exc)) from exc
        except LLMCallError as exc:
            raise BusinessError(502, str(exc)) from exc
        return {
            "available": True,
            "latencyMs": int((time.perf_counter() - start) * 1000),
            **result,
        }

    def _get_or_default(self) -> SystemConfig:
        item = self.db.query(SystemConfig).filter(SystemConfig.config_type == "llm").first()
        if item is None:
            item = SystemConfig(
                config_type="llm",
                config_name="大模型配置",
                config_data={
                    "apiUrl": "https://api.example.com/v1/chat/completions",
                    "modelName": "report-model",
                    "timeoutSeconds": 120,
                    "enabled": True,
                },
                is_active=True,
            )
            self.db.add(item)
            self.db.commit()
            self.db.refresh(item)
        return item

    def _item(self, item: SystemConfig) -> dict:
        data = item.config_data or {}
        return {
            "configId": to_external_id("cfg", item.id),
            "apiUrl": data.get("apiUrl"),
            "modelName": data.get("modelName"),
            "apiKeyMasked": self._masked(data.get("apiKeyEncrypted")),
            "timeoutSeconds": data.get("timeoutSeconds", 120),
            "enabled": data.get("enabled", item.is_active),
            "updatedAt": isoformat(item.updated_at),
        }

    def _masked(self, encrypted: str | None) -> str:
        if not encrypted:
            return ""
        try:
            key = base64.b64decode(encrypted.encode()).decode()
        except Exception:
            return "****"
        if len(key) <= 8:
            return "****"
        return f"{key[:3]}****{key[-4:]}"