from sqlalchemy import Column, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func

from app.db.base import Base
from app.db.types import IdType


class ReportExport(Base):
    __tablename__ = "report_exports"

    id = Column(IdType, primary_key=True, autoincrement=True)
    report_id = Column(IdType, ForeignKey("report_records.id"), nullable=False, index=True)
    file_name = Column(String(500))
    file_format = Column(String(20), nullable=False, default="docx")
    file_path = Column(String(1000))
    file_size = Column(Integer, default=0)
    status = Column(String(50), nullable=False, default="exporting")
    error_message = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_flag = Column(SmallInteger, nullable=False, default=0)
