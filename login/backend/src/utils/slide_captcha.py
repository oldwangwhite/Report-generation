import random
import io
import base64
from PIL import Image, ImageDraw, ImageFont
from src.config.settings import settings
from src.utils.redis_client import redis_client

CAPTCHA_SLIDE_PREFIX = "captcha_slide:"
THRESHOLD = 5
IMAGE_WIDTH = 300
IMAGE_HEIGHT = 200
SLIDER_WIDTH = 50
SLIDER_HEIGHT = 50

# 尝试加载字体，若失败则用默认
try:
    FONT = ImageFont.truetype("arial.ttf", 24)
except:
    FONT = ImageFont.load_default()


async def generate_slide_captcha():
    # 1. 生成灰色底图
    img = Image.new('RGB', (IMAGE_WIDTH, IMAGE_HEIGHT), (240, 240, 240))
    draw = ImageDraw.Draw(img)

    # 2. 绘制网格线（浅灰色）
    for x in range(0, IMAGE_WIDTH, 40):
        draw.line([(x, 0), (x, IMAGE_HEIGHT)], fill=(220, 220, 220), width=1)
    for y in range(0, IMAGE_HEIGHT, 40):
        draw.line([(0, y), (IMAGE_WIDTH, y)], fill=(220, 220, 220), width=1)

    # 3. 随机绘制干扰线
    for _ in range(5):
        x1 = random.randint(0, IMAGE_WIDTH)
        y1 = random.randint(0, IMAGE_HEIGHT)
        x2 = random.randint(0, IMAGE_WIDTH)
        y2 = random.randint(0, IMAGE_HEIGHT)
        draw.line([(x1, y1), (x2, y2)], fill=(180, 180, 180), width=2)

    # 4. 随机绘制一些彩色圆点
    for _ in range(80):
        x = random.randint(0, IMAGE_WIDTH - 1)
        y = random.randint(0, IMAGE_HEIGHT - 1)
        draw.point((x, y), fill=(random.randint(100, 200), random.randint(100, 200), random.randint(100, 200)))

    # 5. 绘制随机文字（干扰）
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789'
    for _ in range(4):
        x = random.randint(10, IMAGE_WIDTH - 60)
        y = random.randint(10, IMAGE_HEIGHT - 30)
        c = random.choice(chars)
        draw.text((x, y), c, fill=(150, 150, 150), font=FONT)

    # 6. 确定缺口位置
    gap_x = random.randint(50, IMAGE_WIDTH - SLIDER_WIDTH - 50)
    gap_y = random.randint(0, IMAGE_HEIGHT - SLIDER_HEIGHT)

    # 7. 在缺口区域绘制一个与背景不同的方块（例如深色半透明效果）
    gap_rect = (gap_x, gap_y, gap_x + SLIDER_WIDTH, gap_y + SLIDER_HEIGHT)
    # 绘制一个带边框的圆角矩形缺口
    draw.rounded_rectangle(gap_rect, radius=5, fill=(150, 150, 150), outline=(100, 100, 100))

    # 8. 生成滑块图（从完整背景中裁出缺口区域，并加入轻微模糊以模拟阴影）
    slider_img = img.crop(gap_rect)
    # 为滑块添加边框
    slider_draw = ImageDraw.Draw(slider_img)
    slider_draw.rectangle((0, 0, SLIDER_WIDTH - 1, SLIDER_HEIGHT - 1), outline=(80, 80, 80))

    # 转为 base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    bg_base64 = base64.b64encode(buffered.getvalue()).decode()

    buffered2 = io.BytesIO()
    slider_img.save(buffered2, format="PNG")
    slider_base64 = base64.b64encode(buffered2.getvalue()).decode()

    # 存入 Redis
    captcha_id = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=32))
    key = CAPTCHA_SLIDE_PREFIX + captcha_id
    await redis_client.setex(key, settings.CAPTCHA_EXPIRE_SECONDS, str(gap_x))

    return {
        "captchaId": captcha_id,
        "bgImage": f"data:image/png;base64,{bg_base64}",
        "sliderImage": f"data:image/png;base64,{slider_base64}",
        "y": gap_y
    }


async def verify_slide_captcha(captcha_id: str, distance: int):
    key = CAPTCHA_SLIDE_PREFIX + captcha_id
    expected_str = await redis_client.get(key)
    if not expected_str:
        return False
    if expected_str == "verified":
        return True
    try:
        expected = int(expected_str)
    except ValueError:
        return False
    if abs(distance - expected) <= THRESHOLD:
        await redis_client.setex(key, settings.CAPTCHA_EXPIRE_SECONDS, "verified")
        return True
    await redis_client.delete(key)
    return False


async def is_slide_captcha_verified(captcha_id: str):
    key = CAPTCHA_SLIDE_PREFIX + captcha_id
    val = await redis_client.get(key)
    return val == "verified"