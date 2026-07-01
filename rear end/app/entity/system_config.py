from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text, func

from app.db.base import Base
from app.db.types import IdType


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(IdType, primary_key=True, autoincrement=True)
    config_type = Column(String(50), nullable=False, unique=True, index=True)
    config_name = Column(String(100), nullable=False)
    config_data = Column(JSON, nullable=False, default=dict)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    updated_by = Column(IdType)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(IdType, primary_key=True, autoincrement=True)
    user_id = Column(IdType, index=True)
    operation_type = Column(String(50), nullable=False, index=True)
    kb_id = Column(Integer)
    doc_id = Column(Integer)
    detail = Column(JSON)
    ip_address = Column(String(50))
    created_at = Column(DateTime, server_default=func.now(), index=True)
