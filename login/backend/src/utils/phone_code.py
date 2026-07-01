import random
from src.utils.redis_client import redis_client
from src.utils.sms_v2 import send_sms_v2

PHONE_CODE_PREFIX = "phone_code:"
SEND_INTERVAL = 60

async def send_phone_code(phone: str) -> bool:
    lock_key = f"phone_lock:{phone}"
    if await redis_client.exists(lock_key):
        return False

    code = ''.join(random.choices('0123456789', k=6))
    key = PHONE_CODE_PREFIX + phone
    await redis_client.setex(key, 300, code)
    await redis_client.setex(lock_key, SEND_INTERVAL, '1')

    try:
        await send_sms_v2(phone, code)
        return True
    except Exception as e:
        print(f"短信发送失败: {e}")
        await redis_client.delete(key)
        await redis_client.delete(lock_key)
        return False

async def verify_phone_code(phone: str, code: str) -> bool:
    # 可以直接用 Redis 核验，也可以调用阿里云 CheckSmsVerifyCode 接口。
    # 这里使用 Redis 核验即可，但如果你希望更安全，可改为调用 check_sms_v2。
    key = PHONE_CODE_PREFIX + phone
    stored = await redis_client.get(key)
    if stored and stored == code:
        await redis_client.delete(key)
        return True
    return False