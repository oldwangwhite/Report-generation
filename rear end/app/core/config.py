from functools import lru_cache
from pathlib import Path
import os


def _load_dotenv() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


class Settings:
    def __init__(self) -> None:
        _load_dotenv()
        self.app_name = os.getenv("APP_NAME", "report-generation-backend")
        self.app_env = os.getenv("APP_ENV", "dev")
        self.database_url = os.getenv(
            "DATABASE_URL",
            "sqlite:///./report_generation_dev.db",
        )
        self.upload_dir = Path(os.getenv("UPLOAD_DIR", "./uploads"))
        self.export_dir = Path(os.getenv("EXPORT_DIR", "./exports"))
        self.max_upload_size_mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
        self.default_page = int(os.getenv("DEFAULT_PAGE", "1"))
        self.default_size = int(os.getenv("DEFAULT_SIZE", "10"))
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.auth_secret_key = os.getenv("AUTH_SECRET_KEY", "report-generation-dev-secret")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))
        self.max_login_attempts = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
        self.login_lock_minutes = int(os.getenv("LOGIN_LOCK_MINUTES", "30"))
        raw_static_tokens = os.getenv("ENABLE_STATIC_TEST_TOKENS")
        self.enable_static_test_tokens = (
            raw_static_tokens.lower() in {"1", "true", "yes", "on"}
            if raw_static_tokens is not None
            else self.app_env == "test"
        )
        self.verification_code_ttl_minutes = int(os.getenv("VERIFICATION_CODE_TTL_MINUTES", "5"))
        self.verification_code_cooldown_seconds = int(os.getenv("VERIFICATION_CODE_COOLDOWN_SECONDS", "60"))
        self.expose_dev_verification_codes = _bool_env(
            "EXPOSE_DEV_VERIFICATION_CODES",
            self.app_env == "test",
        )
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "465"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_from = os.getenv("SMTP_FROM", self.smtp_user)
        self.smtp_use_ssl = _bool_env("SMTP_USE_SSL", True)
        self.smtp_use_starttls = _bool_env("SMTP_USE_STARTTLS", False)
        self.smtp_timeout_seconds = int(os.getenv("SMTP_TIMEOUT_SECONDS", "10"))
        self.sms_http_url = os.getenv("SMS_HTTP_URL", "")
        self.sms_http_method = os.getenv("SMS_HTTP_METHOD", "POST").upper()
        self.sms_http_headers_json = os.getenv("SMS_HTTP_HEADERS_JSON", "{}")
        self.sms_http_query_template = os.getenv("SMS_HTTP_QUERY_TEMPLATE", "{}")
        self.sms_http_body_template = os.getenv("SMS_HTTP_BODY_TEMPLATE", "")
        self.sms_http_success_status = os.getenv("SMS_HTTP_SUCCESS_STATUS", "200,201,202")
        self.sms_http_timeout_seconds = int(os.getenv("SMS_HTTP_TIMEOUT_SECONDS", "10"))
        raw_cors_origins = os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173",
        )
        self.cors_origins = [item.strip() for item in raw_cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
