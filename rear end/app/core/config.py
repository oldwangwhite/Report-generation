from functools import lru_cache
from pathlib import Path
import os


class Settings:
    def __init__(self) -> None:
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
        raw_cors_origins = os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173",
        )
        self.cors_origins = [item.strip() for item in raw_cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
