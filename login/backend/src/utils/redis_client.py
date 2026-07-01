# backend/app/auth/redis_client.py
import redis.asyncio as redis
from datetime import timedelta
from src.config.settings import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


class LoginAttemptTracker:
    PREFIX = "login_attempt:"
    FREEZE_PREFIX = "login_frozen:"

    @classmethod
    async def record_failure(cls, identifier: str) -> int:
        """记录一次失败，返回当前失败次数"""
        key = cls.PREFIX + identifier
        attempts = await redis_client.incr(key)
        await redis_client.expire(key, 3600 * 24)  # 保留24小时
        return attempts

    @classmethod
    async def get_failures(cls, identifier: str) -> int:
        val = await redis_client.get(cls.PREFIX + identifier)
        return int(val) if val else 0

    @classmethod
    async def reset_failures(cls, identifier: str):
        await redis_client.delete(cls.PREFIX + identifier, cls.FREEZE_PREFIX + identifier)

    @classmethod
    async def set_frozen(cls, identifier: str, hours: int = settings.FREEZE_DURATION_HOURS):
        key = cls.FREEZE_PREFIX + identifier
        await redis_client.setex(key, timedelta(hours=hours), "1")

    @classmethod
    async def is_frozen(cls, identifier: str) -> bool:
        return await redis_client.exists(cls.FREEZE_PREFIX + identifier) > 0

    @classmethod
    async def get_frozen_ttl(cls, identifier: str) -> int:
        """剩余冻结秒数"""
        return await redis_client.ttl(cls.FREEZE_PREFIX + identifier)