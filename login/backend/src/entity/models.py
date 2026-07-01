# backend/app/models.py
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import relationship
from src.config.database import Base

class Role(Base):
    __tablename__ = "roles"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100))
    description = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True)
    name = Column(String(100))
    description = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

class RolePermission(Base):
    __tablename__ = "role_permissions"
    role_id = Column(BigInteger, ForeignKey("roles.id"), primary_key=True)
    permission_id = Column(BigInteger, ForeignKey("permissions.id"), primary_key=True)

class User(Base):
    __tablename__ = "users"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    # 新增的字段
    password_salt = Column(String(64), comment='密码盐值')
    phone = Column(String(20), unique=True)
    phone_verified = Column(Boolean, default=False)
    display_name = Column(String(100))
    avatar_url = Column(String(500))
    role_id = Column(BigInteger, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime)
    last_login_ip = Column(String(50))
    login_count = Column(Integer, default=0)
    email = Column(String(128), unique=True, comment='邮箱地址')
    email_verified = Column(Boolean, default=False, comment='邮箱是否已验证')

    # 登录失败与冻结（采用新字段）
    login_fail_count = Column(Integer, default=0, comment='连续登录失败次数')
    locked_until = Column(DateTime, comment='账户锁定截止时间')
    password_changed_at = Column(DateTime, comment='最后修改密码时间')
    require_password_change = Column(Boolean, default=False, comment='是否强制要求修改密码')

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    role = relationship("Role")