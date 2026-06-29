from sqlalchemy import Column, DateTime, ForeignKey, Integer, SmallInteger, String, func

from app.db.base import Base
from app.db.types import IdType


class ReportOutline(Base):
    __tablename__ = "report_outlines"

    id = Column(IdType, primary_key=True, autoincrement=True)
    report_id = Column(IdType, ForeignKey("report_records.id"), nullable=False, index=True)
    parent_id = Column(IdType, nullable=True, index=True)
    chapter_no = Column(String(50), nullable=False)
    title = Column(String(500), nullable=False)
    level = Column(Integer, nullable=False)
    sort_order = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_flag = Column(SmallInteger, nullable=False, default=0)
