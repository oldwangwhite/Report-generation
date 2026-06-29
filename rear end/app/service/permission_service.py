from sqlalchemy.orm import Session

from app.core.errors import BusinessError, ForbiddenError
from app.core.security import CurrentUser
from app.entity.user import Permission, Role, RolePermission

ROLE_API_TO_DB = {"user": "standard_user", "admin": "admin", "super_admin": "super_admin"}
ROLE_DB_TO_API = {value: key for key, value in ROLE_API_TO_DB.items()}

PERMISSION_DEFINITIONS = [
    {
        "code": "report.generate",
        "name": "报告生成",
        "description": "创建报告、生成大纲、生成和编辑章节正文",
    },
    {
        "code": "report.export",
        "name": "报告导出下载",
        "description": "导出、重新导出和下载报告文件",
    },
    {
        "code": "admin.resources",
        "name": "模板素材模型配置",
        "description": "管理报告模板、专业素材和大模型配置",
    },
    {
        "code": "user.manage",
        "name": "用户与角色管理",
        "description": "管理用户账号、用户角色和角色权限组合",
    },
]

ALL_PERMISSION_CODES = [item["code"] for item in PERMISSION_DEFINITIONS]
DEFAULT_ROLE_PERMISSIONS = {
    "standard_user": ["report.generate", "report.export"],
    "admin": ["report.generate", "report.export", "admin.resources"],
    "super_admin": ALL_PERMISSION_CODES,
}


def ensure_default_permissions(db: Session) -> None:
    permissions_by_code: dict[str, Permission] = {}
    for definition in PERMISSION_DEFINITIONS:
        permission = db.query(Permission).filter(Permission.code == definition["code"]).first()
        if permission is None:
            permission = Permission(**definition)
            db.add(permission)
            db.flush()
        else:
            permission.name = definition["name"]
            permission.description = definition["description"]
            db.add(permission)
        permissions_by_code[permission.code] = permission

    for db_role, default_codes in DEFAULT_ROLE_PERMISSIONS.items():
        role = db.query(Role).filter(Role.name == db_role).first()
        if role is None:
            continue
        existing_count = db.query(RolePermission).filter(RolePermission.role_id == role.id).count()
        if existing_count > 0:
            continue
        for code in default_codes:
            permission = permissions_by_code.get(code)
            if permission is not None:
                db.add(RolePermission(role_id=role.id, permission_id=permission.id))


def list_role_permissions(db: Session) -> dict:
    ensure_default_permissions(db)
    db.flush()
    roles = db.query(Role).order_by(Role.id).all()
    permissions = db.query(Permission).order_by(Permission.id).all()
    permission_by_id = {permission.id: permission for permission in permissions}
    role_items = []
    for role in roles:
        assigned = db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
        codes = [permission_by_id[item.permission_id].code for item in assigned if item.permission_id in permission_by_id]
        role_items.append(
            {
                "role": ROLE_DB_TO_API.get(role.name, role.name),
                "roleName": role.display_name,
                "permissionCodes": sorted(codes),
            }
        )
    return {
        "availablePermissions": [
            {"code": item.code, "name": item.name, "description": item.description} for item in permissions
        ],
        "roles": role_items,
    }


def update_role_permissions(db: Session, role: str, permission_codes: list[str]) -> dict:
    if role == "super_admin":
        raise BusinessError(400, "超级管理员默认拥有全部权限，不支持收回")
    db_role = ROLE_API_TO_DB.get(role)
    if not db_role:
        raise BusinessError(400, "参数错误", {"field": "role"})

    ensure_default_permissions(db)
    role_entity = db.query(Role).filter(Role.name == db_role).first()
    if role_entity is None:
        raise BusinessError(400, "参数错误", {"field": "role"})

    permissions = db.query(Permission).filter(Permission.code.in_(permission_codes or [])).all()
    found_codes = {permission.code for permission in permissions}
    invalid_codes = sorted(set(permission_codes or []) - found_codes)
    if invalid_codes:
        raise BusinessError(400, "参数错误", {"field": "permissionCodes", "invalid": invalid_codes})

    db.query(RolePermission).filter(RolePermission.role_id == role_entity.id).delete()
    for permission in permissions:
        db.add(RolePermission(role_id=role_entity.id, permission_id=permission.id))
    db.commit()
    return list_role_permissions(db)


def role_permission_codes(db: Session, role: str) -> set[str]:
    if role == "super_admin":
        return set(ALL_PERMISSION_CODES)
    db_role = ROLE_API_TO_DB.get(role, role)
    ensure_default_permissions(db)
    role_entity = db.query(Role).filter(Role.name == db_role).first()
    if role_entity is None:
        return set()
    rows = (
        db.query(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role_id == role_entity.id)
        .all()
    )
    return {row[0] for row in rows}


def require_permission(db: Session, user: CurrentUser, permission_code: str) -> None:
    if permission_code not in role_permission_codes(db, user.role):
        raise ForbiddenError()