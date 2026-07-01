# backend/app/settings.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost/power_knowledge_management"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120   # 2小时
    REDIS_URL: str = "redis://localhost:6379/0"
    CAPTCHA_EXPIRE_SECONDS: int = 300
    FREEZE_DURATION_HOURS: int = 12
    MAX_LOGIN_ATTEMPTS_BEFORE_FREEZE: int = 5
    REQUIRE_CAPTCHA_AFTER_FAILURES: int = 2
    SMTP_HOST: str = "smtp.163.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = "18077028142@163.com"
    SMTP_PASSWORD: str = "QQpWyxi8WCs4M5cG"  # 163 邮箱授权码
    SMTP_FROM: str = "18077028142@163.com"
    SMS_ACCESS_KEY_ID: str = ""
    SMS_ACCESS_KEY_SECRET: str = ""
    ALIBABA_CLOUD_ACCESS_KEY_ID: str = ""
    ALIBABA_CLOUD_ACCESS_KEY_SECRET: str = ""
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "tech-platform"
    MINIO_SECURE: bool = False   # 是否使用 HTTPS
    class Config:
        env_file = ".env"

settings = Settings()