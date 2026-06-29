import json
from collections.abc import Iterable
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ai.chapter_generator import (
    chapter_start_payload,
    chunk_text,
    generate_chapter_text,
    generate_table,
)
from app.core.errors import NotFoundError
from app.core.security import CurrentUser
from app.entity.outline import ReportOutline
from app.repository.content_repository import ContentRepository
from app.service.report_service import ReportService
from app.utils.datetime_utils import isoformat
from app.utils.id_utils import parse_external_id, to_external_id


class ContentGenerationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.report_service = ReportService(db)
        self.contents = ContentRepository(db)

    def save_content(self, report_id: str, chapter_id: str, payload, user: CurrentUser) -> dict:
        report = self.report_service._get_report_for_user(report_id, user)
        chapter = self._get_chapter(report.id, chapter_id)
        tables = [table.model_dump(by_alias=True) for table in payload.tables]
        saved = self.contents.upsert(
            report_id=report.id,
            chapter_id=chapter.id,
            content=payload.content,
            tables=tables,
            manual_edited=payload.manual_edited,
            status="done",
        )
        chapter.status = "done"
        self.db.add(chapter)
        self.db.commit()
        return {
            "chapterId": chapter_id,
            "status": saved.status,
            "updatedAt": isoformat(saved.updated_at or datetime.now(timezone.utc)),
        }

    def stream_generate(self, report_id: str, payload, user: CurrentUser) -> Iterable[str]:
        report = self.report_service._get_report_for_user(report_id, user)
        chapter_ids = [parse_external_id("chap", item) for item in payload.chapter_ids]
        chapters_query = self.db.query(ReportOutline).filter(
            ReportOutline.report_id == report.id,
            ReportOutline.deleted_flag == 0,
        )
        if chapter_ids:
            chapters_query = chapters_query.filter(ReportOutline.id.in_(chapter_ids))
        chapters = chapters_query.order_by(ReportOutline.chapter_no).all()
        total = len(chapters)
        completed = 0
        report.status = "generating"
        self.db.add(report)
        self.db.commit()

        for chapter in chapters:
            yield self._event("chapterStart", chapter_start_payload(report, chapter))
            existing = self.contents.get_by_chapter(report.id, chapter.id)
            if existing and existing.manual_edited and not payload.force_overwrite:
                content = existing.content
                tables = existing.tables or []
            else:
                content = generate_chapter_text(report, chapter)
                tables = [generate_table(chapter)] if chapter.level == 1 else []
                self.contents.upsert(
                    report_id=report.id,
                    chapter_id=chapter.id,
                    content=content,
                    tables=tables,
                    manual_edited=False,
                    status="done",
                )
            chapter.status = "done"
            self.db.add(chapter)
            self.db.commit()

            for delta in chunk_text(content):
                yield self._event(
                    "chunk",
                    {
                        "reportId": report_id,
                        "chapterId": to_external_id("chap", chapter.id),
                        "contentDelta": delta,
                    },
                )
            for table in tables:
                yield self._event(
                    "table",
                    {
                        "reportId": report_id,
                        "chapterId": to_external_id("chap", chapter.id),
                        "table": table,
                    },
                )
            completed += 1
            percent = int(completed * 100 / total) if total else 100
            yield self._event(
                "progress",
                {
                    "reportId": report_id,
                    "completedChapters": completed,
                    "totalChapters": total,
                    "percent": percent,
                },
            )
            yield self._event(
                "chapterDone",
                {
                    "reportId": report_id,
                    "chapterId": to_external_id("chap", chapter.id),
                    "status": "done",
                },
            )

        report.status = "generated"
        report.generated_at = datetime.now(timezone.utc)
        self.db.add(report)
        self.db.commit()
        yield self._event("done", {"reportId": report_id, "status": "generated"})

    def stream_regenerate(
        self, report_id: str, chapter_id: str, payload, user: CurrentUser
    ) -> Iterable[str]:
        report = self.report_service._get_report_for_user(report_id, user)
        chapter = self._get_chapter(report.id, chapter_id)
        return self._stream_single(report_id, report, chapter, payload.force_overwrite, payload.extra_prompt)

    def _stream_single(
        self,
        report_id: str,
        report,
        chapter: ReportOutline,
        force_overwrite: bool,
        extra_prompt: str | None,
    ) -> Iterable[str]:
        yield self._event("chapterStart", chapter_start_payload(report, chapter))
        existing = self.contents.get_by_chapter(report.id, chapter.id)
        if existing and existing.manual_edited and not force_overwrite:
            content = existing.content
            tables = existing.tables or []
        else:
            content = generate_chapter_text(report, chapter, extra_prompt)
            tables = [generate_table(chapter)] if chapter.level == 1 else []
            self.contents.upsert(
                report_id=report.id,
                chapter_id=chapter.id,
                content=content,
                tables=tables,
                manual_edited=False,
                status="done",
            )
        for delta in chunk_text(content):
            yield self._event(
                "chunk",
                {
                    "reportId": report_id,
                    "chapterId": to_external_id("chap", chapter.id),
                    "contentDelta": delta,
                },
            )
        for table in tables:
            yield self._event(
                "table",
                {
                    "reportId": report_id,
                    "chapterId": to_external_id("chap", chapter.id),
                    "table": table,
                },
            )
        yield self._event(
            "progress",
            {"reportId": report_id, "completedChapters": 1, "totalChapters": 1, "percent": 100},
        )
        yield self._event(
            "chapterDone",
            {"reportId": report_id, "chapterId": to_external_id("chap", chapter.id), "status": "done"},
        )
        yield self._event("done", {"reportId": report_id, "status": "generated"})

    def _get_chapter(self, report_id: int, chapter_id: str) -> ReportOutline:
        parsed = parse_external_id("chap", chapter_id)
        chapter = (
            self.db.query(ReportOutline)
            .filter(
                ReportOutline.id == parsed,
                ReportOutline.report_id == report_id,
                ReportOutline.deleted_flag == 0,
            )
            .first()
        )
        if chapter is None:
            raise NotFoundError()
        return chapter

    def _event(self, name: str, data: dict) -> str:
        return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
