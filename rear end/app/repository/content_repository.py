from sqlalchemy.orm import Session

from app.entity.content import ReportChapterContent


class ContentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_chapter(self, report_id: int, chapter_id: int) -> ReportChapterContent | None:
        return (
            self.db.query(ReportChapterContent)
            .filter(
                ReportChapterContent.report_id == report_id,
                ReportChapterContent.chapter_id == chapter_id,
                ReportChapterContent.deleted_flag == 0,
            )
            .first()
        )

    def upsert(
        self,
        *,
        report_id: int,
        chapter_id: int,
        content: str,
        tables: list[dict],
        manual_edited: bool,
        status: str = "done",
    ) -> ReportChapterContent:
        item = self.get_by_chapter(report_id, chapter_id)
        if item is None:
            item = ReportChapterContent(report_id=report_id, chapter_id=chapter_id)
        item.content = content
        item.tables = tables
        item.manual_edited = manual_edited
        item.status = status
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item
