from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func

from app.db.base import Base
from app.db.types import IdType


class Role(Base):
    __tablename__ = "roles"

    id = Column(IdType, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(IdType, primary_key=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(IdType, ForeignKey("roles.id"), primary_key=True)
    permission_id = Column(IdType, ForeignKey("permissions.id"), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(IdType, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(128), unique=True, index=True)
    email_verified = Column(Boolean, default=False)
    phone = Column(String(20), unique=True, index=True)
    phone_verified = Column(Boolean, default=False)
    display_name = Column(String(100))
    avatar_url = Column(String(500))
    role_id = Column(IdType, ForeignKey("roles.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime)
    last_login_ip = Column(String(50))
    login_count = Column(Integer, default=0)
    login_fail_count = Column(Integer, default=0)
    locked_until = Column(DateTime)
    password_changed_at = Column(DateTime)
    require_password_change = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
