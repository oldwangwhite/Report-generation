from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.entity.report import ReportRecord


class ReportRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, report: ReportRecord) -> ReportRecord:
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def get_active(self, report_id: int) -> ReportRecord | None:
        return (
            self.db.query(ReportRecord)
            .filter(ReportRecord.id == report_id, ReportRecord.deleted_flag == 0)
            .first()
        )

    def list_active(
        self,
        *,
        created_by: int | None,
        page: int,
        size: int,
        keyword: str | None = None,
        report_type: str | None = None,
        status: str | None = None,
    ) -> tuple[list[ReportRecord], int]:
        query = self.db.query(ReportRecord).filter(ReportRecord.deleted_flag == 0)
        if created_by is not None:
            query = query.filter(ReportRecord.created_by == created_by)
        if keyword:
            like = f"%{keyword}%"
            query = query.filter(
                or_(
                    ReportRecord.report_name.like(like),
                    ReportRecord.topic.like(like),
                    ReportRecord.plant.like(like),
                )
            )
        if report_type:
            query = query.filter(ReportRecord.report_type == report_type)
        if status:
            query = query.filter(ReportRecord.status == status)
        total = query.count()
        items = (
            query.order_by(ReportRecord.created_at.desc(), ReportRecord.id.desc())
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )
        return items, total

    def save(self, report: ReportRecord) -> ReportRecord:
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report
