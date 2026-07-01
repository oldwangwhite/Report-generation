import random
from src.utils.redis_client import redis_client
from src.utils.email import send_email

EMAIL_CODE_PREFIX = "email_code:"
SEND_INTERVAL = 60

async def send_email_code(email: str) -> bool:
    lock_key = f"email_lock:{email}"
    if await redis_client.exists(lock_key):
        print(f"邮箱 {email} 还在冷却中")
        return False

    code = ''.join(random.choices('0123456789', k=6))
    key = EMAIL_CODE_PREFIX + email
    await redis_client.setex(key, 300, code)
    await redis_client.setex(lock_key, SEND_INTERVAL, '1')

    body = f"您的验证码是：<b>{code}</b>，有效期5分钟，请勿泄露。"
    try:
        await send_email(email, "【技术监督平台】邮箱验证码", body)
        print(f"邮件发送成功：{email}")
        return True
    except Exception as e:
        print(f"邮件发送失败：{e}")
        await redis_client.delete(key)
        await redis_client.delete(lock_key)
        return False

async def verify_email_code(email: str, code: str) -> bool:
    key = EMAIL_CODE_PREFIX + email
    stored = await redis_client.get(key)
    if stored and stored == code:
        await redis_client.delete(key)
        return True
    return False