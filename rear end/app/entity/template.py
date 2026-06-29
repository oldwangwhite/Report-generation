from sqlalchemy import Column, DateTime, Integer, JSON, SmallInteger, String, func

from app.db.base import Base
from app.db.types import IdType


class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id = Column(IdType, primary_key=True, autoincrement=True)
    template_name = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False, index=True)
    file_name = Column(String(500), nullable=False, default="")
    file_path = Column(String(1000), nullable=False, default="")
    structure = Column(JSON, nullable=False, default=dict)
    status = Column(String(50), nullable=False, default="enabled")
    created_by = Column(IdType, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_flag = Column(SmallInteger, nullable=False, default=0)
