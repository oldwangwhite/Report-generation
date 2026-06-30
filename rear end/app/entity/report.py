from sqlalchemy import Column, DateTime, Integer, JSON, String, SmallInteger, func

from app.db.base import Base
from app.db.types import IdType


class ReportRecord(Base):
    __tablename__ = "report_records"

    id = Column(IdType, primary_key=True, autoincrement=True)
    report_name = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False, index=True)
    topic = Column(String(500), nullable=False)
    major = Column(String(100))
    plant = Column(String(200))
    year = Column(Integer)
    template_id = Column(IdType, nullable=True, index=True)
    material_ids = Column(JSON, nullable=False, default=list)
    created_by = Column(IdType, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="draft", index=True)
    generated_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_flag = Column(SmallInteger, nullable=False, default=0)
