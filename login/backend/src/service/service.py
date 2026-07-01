# backend/app/auth/service.py
# 移除所有 src.xxx 的绝对导入
from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
import secrets

from ..utils.redis_client import redis_client
from ..entity.models import User, Role
from ..config.settings import settings
from ..utils.utils import hash_password, verify_password, create_access_token
from ..utils.password_validator import validate_password_strength
from ..utils.error_codes import ErrorCode
from ..utils.slide_captcha import is_slide_captcha_verified
from ..utils.email_code import verify_email_code
from ..utils.phone_code import verify_phone_code

def generate_user_id(db: Session) -> str:
    """生成 usr_XXX 格式ID"""
    count = db.query(User).count() + 1
    return f"usr_{count:03d}"


def register_user(db: Session, username: str, password: str,
                  email: str = None, phone: str = None, display_name: str = None):
    # 检查用户名/手机号/邮箱唯一性/非空
    #if not phone:
    #    return None, "手机号不能为空"
    #if not email:
    #    return None, "邮箱不能为空"
    if db.query(User).filter(User.username == username).first():
        return None, "用户名已存在"
    if phone and db.query(User).filter(User.phone == phone).first():
        return None, "手机号已存在"
    if email and db.query(User).filter(User.email == email).first():
        return None, "邮箱已被注册"

    # 密码强度验证
    is_valid, msg = validate_password_strength(password)
    if not is_valid:
        return None, msg

    # 获取默认角色 (standard_user)
    default_role = db.query(Role).filter(Role.name == "standard_user").first()
    if not default_role:
        return None, "系统错误：未找到默认角色"

    user = User(
        username=username,
        password_hash=hash_password(password),
        email=email,
        email_verified=True if email else False,
        phone=phone,
        phone_verified=True if phone else False,
        display_name=display_name or username,
        role_id=default_role.id,
        is_active=True,
        login_fail_count=0,
        locked_until=None,
        require_password_change=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user, None  # 成功时返回用户对象

def generate_reset_token():
    return secrets.token_hex(32)

async def login_user(
    db: Session,
    username: str,
    password: str,
    captcha_id: str,
    ip_address: str = None
):
    # 1. 查找用户（支持用户名/手机号）
    user = db.query(User).filter(
        or_(User.username == username, User.phone == username, User.email == username)
    ).first()
    if not user:
        return None, "用户名或密码错误", None

    # 2. 检查冻结
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = user.locked_until - datetime.utcnow()
        hours = remaining.total_seconds() // 3600
        return None, f"账户已被冻结，请在{hours}小时后重试", ErrorCode.ACCOUNT_FROZEN

    # 3. 滑块验证码校验
    if not captcha_id:
        return None, "需要验证码", ErrorCode.CAPTCHA_REQUIRED
    if not await is_slide_captcha_verified(captcha_id):
        return None, "验证码错误", ErrorCode.INVALID_CAPTCHA

    # 4. 验证密码
    if not verify_password(password, user.password_hash):
        user.login_fail_count += 1
        if user.login_fail_count >= settings.MAX_LOGIN_ATTEMPTS_BEFORE_FREEZE:
            user.locked_until = datetime.utcnow() + timedelta(hours=settings.FREEZE_DURATION_HOURS)
        db.commit()
        return None, "用户名或密码错误", None

    # 5. 登录成功
    user.login_fail_count = 0
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    if ip_address:
        user.last_login_ip = ip_address
    user.login_count = (user.login_count or 0) + 1
    db.commit()

    role = db.query(Role).filter(Role.id == user.role_id).first()
    access_token = create_access_token(data={
        "sub": str(user.id),
        "username": user.username,
        "role": role.name if role else "user"
    })

    return access_token, None, None


async def login_by_email(db: Session, email: str, code: str, ip_address: str = None):
    # 1. 校验邮箱验证码
    if not await verify_email_code(email, code):
        return None, "验证码错误", ErrorCode.INVALID_CAPTCHA

    # 2. 查找已验证邮箱的用户
    user = db.query(User).filter(User.email == email, User.email_verified == True).first()
    if not user:
        return None, "邮箱未注册", ErrorCode.NOT_FOUND

    # 3. 检查账户冻结
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = user.locked_until - datetime.utcnow()
        hours = remaining.total_seconds() // 3600
        return None, f"账户已被冻结，请在{hours}小时后重试", ErrorCode.ACCOUNT_FROZEN

    # 4. 登录成功，重置失败计数
    user.login_fail_count = 0
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    if ip_address:
        user.last_login_ip = ip_address
    user.login_count = (user.login_count or 0) + 1
    db.commit()

    role = db.query(Role).filter(Role.id == user.role_id).first()
    access_token = create_access_token(data={
        "sub": str(user.id),
        "username": user.username,
        "role": role.name if role else "user"
    })

    return access_token, None, None

async def login_by_phone(db: Session, phone: str, code: str, ip_address: str = None):
    if not await verify_phone_code(phone, code):
        return None, "验证码错误", ErrorCode.INVALID_CAPTCHA

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        return None, "手机号未注册", ErrorCode.NOT_FOUND

    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = user.locked_until - datetime.utcnow()
        hours = remaining.total_seconds() // 3600
        return None, f"账户已被冻结，请在{hours}小时后重试", ErrorCode.ACCOUNT_FROZEN

    user.login_fail_count = 0
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    if ip_address:
        user.last_login_ip = ip_address
    user.login_count = (user.login_count or 0) + 1
    db.commit()

    role = db.query(Role).filter(Role.id == user.role_id).first()
    access_token = create_access_token(data={
        "sub": str(user.id),
        "username": user.username,
        "role": role.name if role else "user"
    })
    return access_token, None, None

async def store_reset_token(token: str, user_id: int, expire: int = 300):
    await redis_client.setex(f"reset_pwd:{token}", expire, str(user_id))

async def verify_reset_token(token: str) -> int:
    uid = await redis_client.get(f"reset_pwd:{token}")
    if uid:
        return int(uid)
    return None

def change_password(db: Session, user_id: int, new_password: str):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    user.password_hash = hash_password(new_password)
    user.login_fail_count = 0
    user.locked_until = None
    user.password_changed_at = datetime.utcnow()
    db.commit()
    return True