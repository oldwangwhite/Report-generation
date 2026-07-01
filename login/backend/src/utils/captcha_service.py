# backend/app/auth/captcha_service.py
import base64
import random
import string
from captcha.image import ImageCaptcha
from src.utils.redis_client import redis_client
from src.config.settings import settings

CAPTCHA_PREFIX = "captcha:"


async def generate_captcha() -> dict:
    """返回验证码图片base64和captchaId"""
    chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    image = ImageCaptcha()
    data = image.generate(chars)
    img_bytes = data.read()
    b64 = base64.b64encode(img_bytes).decode()

    captcha_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=32))
    await redis_client.setex(CAPTCHA_PREFIX + captcha_id, settings.CAPTCHA_EXPIRE_SECONDS, chars.lower())

    return {
        "captchaId": captcha_id,
        "captchaImage": f"data:image/png;base64,{b64}"
    }


async def verify_captcha(captcha_id: str, captcha_code: str) -> bool:
    key = CAPTCHA_PREFIX + captcha_id
    stored = await redis_client.get(key)
    if stored and stored == captcha_code.lower():
        await redis_client.delete(key)
        return True
    return False