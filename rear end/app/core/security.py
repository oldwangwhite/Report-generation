from dataclasses import dataclass

from fastapi import Header

from app.core.errors import ForbiddenError, UnauthorizedError


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


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError()
    token = authorization.removeprefix("Bearer ").strip()
    user = TOKEN_USERS.get(token)
    if user is None or user.status != "enabled":
        raise UnauthorizedError()
    return user


def require_admin(user: CurrentUser) -> None:
    if user.role not in {"admin", "super_admin"}:
        raise ForbiddenError()


def require_super_admin(user: CurrentUser) -> None:
    if user.role != "super_admin":
        raise ForbiddenError()
