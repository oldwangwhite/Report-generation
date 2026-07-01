from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.response import api_response, page_result
from app.core.security import CurrentUser, get_current_user, require_super_admin
from app.db.session import get_db
from app.schemas.user import RolePermissionsUpdateRequest, UserRoleUpdateRequest, UserStatusUpdateRequest
from app.service.permission_service import require_permission
from app.service.user_service import UserService

router = APIRouter(prefix="/admin", tags=["users"])


def super_user(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    require_super_admin(current_user)
    require_permission(db, current_user, "user.manage")
    return current_user


@router.get("/users")
def list_users(
    request: Request,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1),
    keyword: str | None = None,
    role: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(super_user),
):
    items, total = UserService(db).list_users(page, size, role, status, keyword)
    return api_response(page_result(items, total, page, size), request)


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(super_user),
):
    return api_response(UserService(db).update_role(user_id, payload.role), request)


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    payload: UserStatusUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(super_user),
):
    return api_response(UserService(db).update_status(user_id, payload.status), request)


@router.get("/roles/permissions")
def list_permissions(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(super_user),
):
    return api_response(UserService(db).list_role_permissions(), request)


@router.put("/roles/{role}/permissions")
def update_permissions(
    role: str,
    payload: RolePermissionsUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(super_user),
):
    return api_response(UserService(db).update_role_permissions(role, payload.permission_codes), request)