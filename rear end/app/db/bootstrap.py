from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.entity.template import ReportTemplate
from app.entity.user import Role, User
from app.service.permission_service import ensure_default_permissions


def seed_reference_data(db: Session) -> None:
    role_defs = [
        ("standard_user", "普通用户"),
        ("admin", "管理员"),
        ("super_admin", "超级管理员"),
    ]
    roles: dict[str, Role] = {}
    for name, display_name in role_defs:
        role = db.query(Role).filter(Role.name == name).first()
        if role is None:
            role = Role(name=name, display_name=display_name, description=display_name)
            db.add(role)
            db.flush()
        else:
            role.display_name = display_name
            role.description = display_name
            db.add(role)
        roles[name] = role

    users = [
        (1, "student", "学生用户", "standard_user"),
        (2, "other", "其他用户", "standard_user"),
        (3, "admin", "管理员", "admin"),
        (4, "super", "超级管理员", "super_admin"),
    ]
    for user_id, username, display_name, role_name in users:
        user = (
            db.query(User)
            .filter(or_(User.id == user_id, User.username == username))
            .first()
        )
        if user is None:
            db.add(
                User(
                    id=user_id,
                    username=username,
                    password_hash="local-test",
                    display_name=display_name,
                    role_id=roles[role_name].id,
                    is_active=True,
                )
            )
        else:
            user.display_name = user.display_name or display_name
            db.add(user)

    for report_type, name in [
        ("summerCheck", "迎峰度夏默认模板"),
        ("coalInventoryAudit", "煤场库存盘点默认模板"),
    ]:
        template = (
            db.query(ReportTemplate)
            .filter(
                ReportTemplate.report_type == report_type,
                ReportTemplate.deleted_flag == 0,
            )
            .first()
        )
        if template is None:
            db.add(
                ReportTemplate(
                    template_name=name,
                    report_type=report_type,
                    file_name=f"{report_type}.docx",
                    file_path="",
                    structure={
                        "titleStyle": "Title",
                        "headingStyle": "Heading 1",
                        "bodyStyle": "Normal",
                        "tableStyle": "Table Grid",
                    },
                    status="enabled",
                    created_by=3,
                )
            )

    ensure_default_permissions(db)
    db.commit()