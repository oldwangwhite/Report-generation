from sqlalchemy.orm import Session

from app.core.errors import BusinessError, NotFoundError
from app.entity.user import Role, User
from app.service.permission_service import (
    ROLE_API_TO_DB,
    ROLE_DB_TO_API,
    list_role_permissions,
    update_role_permissions,
)
from app.utils.datetime_utils import isoformat
from app.utils.id_utils import parse_external_id, to_external_id


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_users(self, page: int, size: int, role: str | None, status: str | None, keyword: str | None):
        query = self.db.query(User)
        if keyword:
            query = query.filter(User.username.like(f"%{keyword}%"))
        if role:
            role_entity = self._role_by_api(role)
            query = query.filter(User.role_id == role_entity.id)
        if status:
            query = query.filter(User.is_active == (status == "enabled"))
        total = query.count()
        items = query.order_by(User.id).offset((page - 1) * size).limit(size).all()
        return [self._item(item) for item in items], total

    def update_role(self, user_id: str, role: str) -> dict:
        user = self._get(user_id)
        user.role_id = self._role_by_api(role).id
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self._item(user)

    def update_status(self, user_id: str, status: str) -> dict:
        if status not in {"enabled", "disabled"}:
            raise BusinessError(400, "参数错误", {"field": "status"})
        user = self._get(user_id)
        user.is_active = status == "enabled"
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self._item(user)

    def list_role_permissions(self) -> dict:
        return list_role_permissions(self.db)

    def update_role_permissions(self, role: str, permission_codes: list[str]) -> dict:
        return update_role_permissions(self.db, role, permission_codes)

    def _get(self, user_id: str) -> User:
        user = self.db.query(User).filter(User.id == parse_external_id("usr", user_id)).first()
        if user is None:
            raise NotFoundError()
        return user

    def _role_by_api(self, role: str) -> Role:
        db_name = ROLE_API_TO_DB.get(role)
        if not db_name:
            raise BusinessError(400, "参数错误", {"field": "role"})
        entity = self.db.query(Role).filter(Role.name == db_name).first()
        if entity is None:
            raise BusinessError(400, "参数错误", {"field": "role"})
        return entity

    def _item(self, user: User) -> dict:
        role = self.db.query(Role).filter(Role.id == user.role_id).first()
        return {
            "userId": to_external_id("usr", user.id),
            "username": user.username,
            "role": ROLE_DB_TO_API.get(role.name if role else "standard_user", "user"),
            "displayName": user.display_name,
            "status": "enabled" if user.is_active else "disabled",
            "createdAt": isoformat(user.created_at),
        }