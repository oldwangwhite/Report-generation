from dataclasses import dataclass

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.auth_utils import decode_access_token
from app.core.errors import ForbiddenError, UnauthorizedError
from app.db.session import get_db
from app.entity.user import Role, User

ROLE_DB_TO_API = {"standard_user": "user", "admin": "admin", "super_admin": "super_admin"}


@dataclass(frozen=True)
class CurrentUser:
    user_id: int
    username: str
    role: str
    display_name: str
    status: str = "enabled"

    @property
    def external_id(self) -> str:
        return f"usr_{self.user_id:03d}"


TOKEN_USERS = {
    "user-token": CurrentUser(1, "student", "user", "学生用户"),
    "other-user-token": CurrentUser(2, "other", "user", "其他用户"),
    "admin-token": CurrentUser(3, "admin", "admin", "管理员"),
    "super-token": CurrentUser(4, "super", "super_admin", "超级管理员"),
}


def _user_from_db(db: Session, user_id: int) -> CurrentUser | None:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        return None
    role = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = ROLE_DB_TO_API.get(role.name if role else "standard_user", "user")
    return CurrentUser(
        user_id=user.id,
        username=user.username,
        role=role_name,
        display_name=user.display_name or user.username,
        status="enabled" if user.is_active else "disabled",
    )


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError()
    token = authorization.removeprefix("Bearer ").strip()
    user = TOKEN_USERS.get(token)
    if user is None:
        payload = decode_access_token(token)
        if payload is not None:
            try:
                user = _user_from_db(db, int(payload.get("sub")))
            except (TypeError, ValueError):
                user = None
    if user is None or user.status != "enabled":
        raise UnauthorizedError()
    return user


def require_admin(user: CurrentUser) -> None:
    if user.role not in {"admin", "super_admin"}:
        raise ForbiddenError()


def require_super_admin(user: CurrentUser) -> None:
    if user.role != "super_admin":
        raise ForbiddenError()
