import json
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from string import Template
from urllib import parse, request

from app.core.config import get_settings
from app.core.errors import BusinessError


class VerificationCodeService:
    def __init__(self, store: dict[str, tuple[str, datetime]]) -> None:
        self.store = store

    def issue(self, kind: str, target: str, code: str) -> dict:
        target = target.strip()
        self._guard_cooldown(kind, target)
        settings = get_settings()
        expires_at = datetime.utcnow() + timedelta(minutes=settings.verification_code_ttl_minutes)
        self.store[f"{kind}:{target}"] = (code, expires_at)
        self.store[f"lock:{kind}:{target}"] = ("1", datetime.utcnow() + timedelta(seconds=settings.verification_code_cooldown_seconds))
        try:
            if kind == "email":
                self._send_email(target, code)
            elif kind == "phone":
                self._send_sms(target, code)
            else:
                raise BusinessError(400, "不支持的验证码类型")
        except Exception:
            self.store.pop(f"{kind}:{target}", None)
            self.store.pop(f"lock:{kind}:{target}", None)
            raise
        result = {"expiresIn": settings.verification_code_ttl_minutes * 60}
        if settings.expose_dev_verification_codes:
            result["devCode"] = code
        return result

    def _guard_cooldown(self, kind: str, target: str) -> None:
        item = self.store.get(f"lock:{kind}:{target}")
        if item and item[1] > datetime.utcnow():
            raise BusinessError(429, "验证码发送过于频繁，请稍后再试")

    def _send_email(self, email: str, code: str) -> None:
        settings = get_settings()
        if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password or not settings.smtp_from:
            raise BusinessError(500, "邮箱验证码服务未配置")
        body = (
            f"<p>您的验证码是：<b>{code}</b></p>"
            f"<p>验证码 {settings.verification_code_ttl_minutes} 分钟内有效，请勿泄露。</p>"
        )
        message = MIMEText(body, "html", "utf-8")
        message["Subject"] = "【技术监督辅助平台】邮箱验证码"
        message["From"] = settings.smtp_from
        message["To"] = email
        if settings.smtp_use_ssl:
            smtp = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=settings.smtp_timeout_seconds)
        else:
            smtp = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=settings.smtp_timeout_seconds)
        with smtp as server:
            if settings.smtp_use_starttls and not settings.smtp_use_ssl:
                server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, [email], message.as_string())

    def _send_sms(self, phone: str, code: str) -> None:
        settings = get_settings()
        if not settings.sms_http_url:
            raise BusinessError(500, "短信验证码服务未配置")
        headers = self._load_json_object(settings.sms_http_headers_json, "SMS_HTTP_HEADERS_JSON")
        query = self._render_json_template(settings.sms_http_query_template, phone, code, "SMS_HTTP_QUERY_TEMPLATE")
        url = settings.sms_http_url
        if query:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}{parse.urlencode(query)}"
        body = self._render_body(settings.sms_http_body_template, phone, code)
        req = request.Request(url, method=settings.sms_http_method)
        for key, value in headers.items():
            req.add_header(key, str(value))
        data = None
        if body:
            data = body.encode("utf-8")
            if not any(key.lower() == "content-type" for key in headers):
                req.add_header("Content-Type", "application/json; charset=utf-8")
        try:
            with request.urlopen(req, data=data, timeout=settings.sms_http_timeout_seconds) as response:
                status = response.status
        except Exception as exc:
            raise BusinessError(502, "短信验证码发送失败", {"reason": str(exc)}) from exc
        success_statuses = {
            int(item.strip())
            for item in settings.sms_http_success_status.split(",")
            if item.strip().isdigit()
        }
        if status not in success_statuses:
            raise BusinessError(502, "短信验证码发送失败", {"status": status})

    def _load_json_object(self, value: str, field: str) -> dict:
        try:
            parsed = json.loads(value or "{}")
        except json.JSONDecodeError as exc:
            raise BusinessError(500, f"{field} 配置不是合法 JSON") from exc
        if not isinstance(parsed, dict):
            raise BusinessError(500, f"{field} 必须是 JSON 对象")
        return parsed

    def _render_json_template(self, value: str, phone: str, code: str, field: str) -> dict:
        raw = Template(value or "{}").safe_substitute(phone=phone, code=code)
        return self._load_json_object(raw, field)

    def _render_body(self, value: str, phone: str, code: str) -> str:
        if not value:
            return ""
        return Template(value).safe_substitute(phone=phone, code=code)
