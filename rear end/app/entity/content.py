from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, SmallInteger, String, Text, func

from app.db.base import Base
from app.db.types import IdType


class ReportChapterContent(Base):
    __tablename__ = "report_chapter_contents"

    id = Column(IdType, primary_key=True, autoincrement=True)
    report_id = Column(IdType, ForeignKey("report_records.id"), nullable=False, index=True)
    chapter_id = Column(IdType, ForeignKey("report_outlines.id"), nullable=False, index=True)
    content = Column(Text, nullable=False, default="")
    tables = Column(JSON, nullable=False, default=list)
    manual_edited = Column(Boolean, nullable=False, default=False)
    status = Column(String(50), nullable=False, default="done")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_flag = Column(SmallInteger, nullable=False, default=0)
