from sqlalchemy.orm import Session

from app.entity.export import ReportExport


class ExportRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, item: ReportExport) -> ReportExport:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def save(self, item: ReportExport) -> ReportExport:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def get_active(self, report_id: int, export_id: int) -> ReportExport | None:
        return (
            self.db.query(ReportExport)
            .filter(
                ReportExport.report_id == report_id,
                ReportExport.id == export_id,
                ReportExport.deleted_flag == 0,
            )
            .first()
        )

    def list_active(
        self, report_id: int, page: int, size: int, file_format: str | None
    ) -> tuple[list[ReportExport], int]:
        query = self.db.query(ReportExport).filter(
            ReportExport.report_id == report_id, ReportExport.deleted_flag == 0
        )
        if file_format:
            query = query.filter(ReportExport.file_format == file_format)
        total = query.count()
        items = (
            query.order_by(ReportExport.created_at.desc(), ReportExport.id.desc())
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )
        return items, total
