from sqlalchemy.orm import Session

from app.entity.outline import ReportOutline


class OutlineRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self, report_id: int) -> list[ReportOutline]:
        return (
            self.db.query(ReportOutline)
            .filter(ReportOutline.report_id == report_id, ReportOutline.deleted_flag == 0)
            .order_by(ReportOutline.chapter_no)
            .all()
        )

    def get_active(self, chapter_id: int) -> ReportOutline | None:
        return (
            self.db.query(ReportOutline)
            .filter(ReportOutline.id == chapter_id, ReportOutline.deleted_flag == 0)
            .first()
        )

    def save_all(self, chapters: list[ReportOutline]) -> list[ReportOutline]:
        for chapter in chapters:
            self.db.add(chapter)
        self.db.commit()
        for chapter in chapters:
            self.db.refresh(chapter)
        return chapters
