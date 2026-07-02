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
from app.ai.model_client import LLMCallError, LLMConfigError, generate_chapter_with_llm
from app.core.errors import BusinessError, NotFoundError
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
        report.status = "generated" if self._all_chapters_done(report.id) else "outlineGenerated"
        if report.status == "generated":
            report.generated_at = datetime.now(timezone.utc)
        self.db.add(report)
        self.db.commit()
        return {
            "chapterId": chapter_id,
            "status": saved.status,
            "updatedAt": isoformat(saved.updated_at or datetime.now(timezone.utc)),
        }

    def stream_generate(self, report_id: str, payload, user: CurrentUser) -> Iterable[str]:
        report = self.report_service._get_report_for_user(report_id, user)
        chapters = self._selected_chapters(report.id, payload.chapter_ids)
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
                try:
                    content = self._generate_chapter_content(report, chapter)
                except (LLMConfigError, LLMCallError, Exception) as exc:
                    yield self._mark_failed(report, chapter, str(exc))
                    return
                tables = [generate_table(report, chapter, content)] if chapter.level == 1 else []
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

        final_status = "generated" if self._all_chapters_done(report.id) else "outlineGenerated"
        report.status = final_status
        if final_status == "generated":
            report.generated_at = datetime.now(timezone.utc)
        self.db.add(report)
        self.db.commit()
        yield self._event("done", {"reportId": report_id, "status": final_status})

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
        report.status = "generating"
        self.db.add(report)
        self.db.commit()
        yield self._event("chapterStart", chapter_start_payload(report, chapter))
        existing = self.contents.get_by_chapter(report.id, chapter.id)
        if existing and existing.manual_edited and not force_overwrite:
            content = existing.content
            tables = existing.tables or []
        else:
            try:
                content = self._generate_chapter_content(report, chapter, extra_prompt)
            except (LLMConfigError, LLMCallError, Exception) as exc:
                yield self._mark_failed(report, chapter, str(exc))
                return
            tables = [generate_table(report, chapter, content)] if chapter.level == 1 else []
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
        yield self._event(
            "progress",
            {"reportId": report_id, "completedChapters": 1, "totalChapters": 1, "percent": 100},
        )
        yield self._event(
            "chapterDone",
            {"reportId": report_id, "chapterId": to_external_id("chap", chapter.id), "status": "done"},
        )
        final_status = "generated" if self._all_chapters_done(report.id) else "outlineGenerated"
        report.status = final_status
        if final_status == "generated":
            report.generated_at = datetime.now(timezone.utc)
        self.db.add(report)
        self.db.commit()
        yield self._event("done", {"reportId": report_id, "status": final_status})

    def _generate_chapter_content(
        self,
        report,
        chapter: ReportOutline,
        extra_prompt: str | None = None,
    ) -> str:
        if not getattr(report, "_skip_llm_generation", False):
            try:
                model_content = generate_chapter_with_llm(self.db, report, chapter, extra_prompt)
                if model_content:
                    return model_content
            except (LLMConfigError, LLMCallError):
                setattr(report, "_skip_llm_generation", True)
        return generate_chapter_text(report, chapter, extra_prompt)

    def _mark_failed(self, report, chapter: ReportOutline, message: str) -> str:
        chapter.status = "failed"
        report.status = "generateFailed"
        self.db.add(chapter)
        self.db.add(report)
        self.db.commit()
        return self._event(
            "error",
            {
                "reportId": to_external_id("rpt", report.id),
                "chapterId": to_external_id("chap", chapter.id),
                "message": message,
            },
        )

    def _all_chapters_done(self, report_id: int) -> bool:
        total = (
            self.db.query(ReportOutline)
            .filter(ReportOutline.report_id == report_id, ReportOutline.deleted_flag == 0)
            .count()
        )
        if total == 0:
            return False
        unfinished = (
            self.db.query(ReportOutline)
            .filter(
                ReportOutline.report_id == report_id,
                ReportOutline.deleted_flag == 0,
                ReportOutline.status != "done",
            )
            .count()
        )
        return unfinished == 0

    def validate_generate_request(self, report_id: str, payload, user: CurrentUser) -> None:
        report = self.report_service._get_report_for_user(report_id, user)
        self._selected_chapters(report.id, payload.chapter_ids)

    def _selected_chapters(self, report_id: int, chapter_ids: list[str]) -> list[ReportOutline]:
        parsed_ids: list[int] = []
        for item in chapter_ids or []:
            try:
                parsed_ids.append(parse_external_id("chap", item))
            except NotFoundError:
                raise BusinessError(400, "Invalid request", {"field": "chapterIds", "reason": "invalid chapter id"}) from None
        query = self.db.query(ReportOutline).filter(
            ReportOutline.report_id == report_id,
            ReportOutline.deleted_flag == 0,
        )
        if parsed_ids:
            query = query.filter(ReportOutline.id.in_(parsed_ids))
        chapters = query.order_by(ReportOutline.chapter_no).all()
        if parsed_ids:
            found_ids = {chapter.id for chapter in chapters}
            missing = [to_external_id("chap", item) for item in parsed_ids if item not in found_ids]
            if missing:
                raise BusinessError(
                    400,
                    "Invalid request",
                    {"field": "chapterIds", "reason": "chapter does not exist in this report", "missing": missing},
                )
        if not chapters:
            raise BusinessError(400, "Invalid request", {"field": "chapterIds", "reason": "report outline is empty"})
        return chapters

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
