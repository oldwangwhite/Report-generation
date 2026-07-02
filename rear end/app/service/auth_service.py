import re
import secrets
from datetime import datetime, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.auth_utils import create_access_token, hash_password, verify_password
from app.core.config import get_settings
from app.core.errors import BusinessError, UnauthorizedError
from app.entity.user import Role, User
from app.service.permission_service import ROLE_DB_TO_API


def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "密码长度至少8位"
    if len(password) > 30:
        return False, "密码长度不能超过30位"

    categories = 0
    categories += 1 if re.search(r"[A-Z]", password) else 0
    categories += 1 if re.search(r"[a-z]", password) else 0
    categories += 1 if re.search(r"[0-9]", password) else 0
    categories += 1 if re.search(r"[^A-Za-z0-9]", password) else 0
    if categories < 3:
        return False, "密码需包含大写字母、小写字母、数字、特殊符号中的至少三种"
    return True, ""


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def register(
        self,
        username: str,
        password: str,
        email: str | None = None,
        phone: str | None = None,
        display_name: str | None = None,
    ) -> dict:
        email = (email or "").strip() or None
        phone = (phone or "").strip() or None
        username = username.strip()
        if self.db.query(User).filter(User.username == username).first():
            raise BusinessError(400, "用户名已存在")
        if email and self.db.query(User).filter(User.email == email).first():
            raise BusinessError(400, "邮箱已被注册")
        if phone and self.db.query(User).filter(User.phone == phone).first():
            raise BusinessError(400, "手机号已存在")

        valid, message = validate_password_strength(password)
        if not valid:
            raise BusinessError(400, message)

        role = self.db.query(Role).filter(Role.name == "standard_user").first()
        if role is None:
            raise BusinessError(500, "系统未初始化默认角色")

        user = User(
            username=username,
            password_hash=hash_password(password),
            email=email,
            email_verified=bool(email),
            phone=phone,
            phone_verified=bool(phone),
            display_name=display_name or username,
            role_id=role.id,
            is_active=True,
            login_fail_count=0,
            login_count=0,
            require_password_change=False,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self._login_result(user)

    def login(self, username: str, password: str, ip_address: str | None = None) -> dict:
        user = (
            self.db.query(User)
            .filter(or_(User.username == username, User.email == username, User.phone == username))
            .first()
        )
        if user is None:
            raise UnauthorizedError("账号或密码错误")
        if not user.is_active:
            raise UnauthorizedError("账号已停用")
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise BusinessError(401, "账户已被锁定，请稍后再试")
        if not verify_password(password, user.password_hash):
            settings = get_settings()
            user.login_fail_count = (user.login_fail_count or 0) + 1
            if user.login_fail_count >= settings.max_login_attempts:
                user.locked_until = datetime.utcnow() + timedelta(minutes=settings.login_lock_minutes)
            self.db.add(user)
            self.db.commit()
            raise UnauthorizedError("账号或密码错误")

        user.login_fail_count = 0
        user.locked_until = None
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = ip_address
        user.login_count = (user.login_count or 0) + 1
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self._login_result(user)

    def login_by_email(self, email: str, ip_address: str | None = None) -> dict:
        user = self.db.query(User).filter(User.email == email, User.email_verified == True).first()
        if user is None:
            raise BusinessError(404, "邮箱未注册")
        return self._login_existing_user(user, ip_address)

    def login_by_phone(self, phone: str, ip_address: str | None = None) -> dict:
        user = self.db.query(User).filter(User.phone == phone, User.phone_verified == True).first()
        if user is None:
            raise BusinessError(404, "手机号未注册")
        return self._login_existing_user(user, ip_address)

    def create_reset_token(self, contact: str) -> dict:
        if "@" in contact:
            user = self.db.query(User).filter(User.email == contact).first()
        else:
            user = self.db.query(User).filter(User.phone == contact).first()
        if user is None:
            raise BusinessError(404, "该联系方式未绑定任何账号")
        return {
            "token": secrets.token_urlsafe(32),
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
        }

    def reset_password(self, username: str, new_password: str) -> None:
        user = self.db.query(User).filter(User.username == username).first()
        if user is None:
            raise BusinessError(404, "用户不存在")
        valid, message = validate_password_strength(new_password)
        if not valid:
            raise BusinessError(400, message)
        user.password_hash = hash_password(new_password)
        user.login_fail_count = 0
        user.locked_until = None
        user.password_changed_at = datetime.utcnow()
        self.db.add(user)
        self.db.commit()

    def current_user_result(self, user: User) -> dict:
        return self._user_data(user)

    def _login_result(self, user: User) -> dict:
        role = self._role(user)
        token = create_access_token(
            {
                "sub": str(user.id),
                "username": user.username,
                "role": ROLE_DB_TO_API.get(role.name if role else "standard_user", "user"),
            }
        )
        return {
            "accessToken": token,
            "expiresIn": get_settings().access_token_expire_minutes * 60,
            "user": self._user_data(user),
        }

    def _role(self, user: User) -> Role | None:
        return self.db.query(Role).filter(Role.id == user.role_id).first()

    def _login_existing_user(self, user: User, ip_address: str | None = None) -> dict:
        if not user.is_active:
            raise UnauthorizedError("账号已停用")
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise BusinessError(401, "账户已被锁定，请稍后再试")
        user.login_fail_count = 0
        user.locked_until = None
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = ip_address
        user.login_count = (user.login_count or 0) + 1
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self._login_result(user)

    def _user_data(self, user: User) -> dict:
        role = self._role(user)
        return {
            "userId": f"usr_{user.id:03d}",
            "username": user.username,
            "role": ROLE_DB_TO_API.get(role.name if role else "standard_user", "user"),
            "displayName": user.display_name or user.username,
            "email": user.email,
            "phone": user.phone,
        }
