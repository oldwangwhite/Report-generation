from sqlalchemy.orm import Session

from app.ai.outline_generator import default_outline, flatten_outline
from app.core.errors import BusinessError, NotFoundError
from app.core.security import CurrentUser
from app.entity.outline import ReportOutline
from app.repository.outline_repository import OutlineRepository
from app.service.report_service import REPORT_TYPES, ReportService
from app.utils.id_utils import parse_external_id, to_external_id
from app.utils.outline_numbering import renumber_outline


class OutlineService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.outlines = OutlineRepository(db)
        self.report_service = ReportService(db)

    def generate_outline(self, report_id: str, payload, user: CurrentUser) -> dict:
        report = self.report_service._get_report_for_user(report_id, user)
        report_type = payload.report_type or report.report_type
        if report_type not in REPORT_TYPES:
            raise BusinessError(
                400,
                "参数错误",
                {"field": "reportType", "reason": "不支持的报告类型"},
            )
        old = self.outlines.list_active(report.id)
        for chapter in old:
            chapter.deleted_flag = 1
            self.db.add(chapter)
        self.db.flush()

        flattened = flatten_outline(default_outline(report_type))
        created: list[ReportOutline] = []
        index_to_id: dict[int, int] = {}
        for index, item in enumerate(flattened):
            parent_id = index_to_id.get(item["parentIndex"])
            chapter = ReportOutline(
                report_id=report.id,
                parent_id=parent_id,
                chapter_no="",
                title=item["title"],
                level=item["level"],
                sort_order=item["sortOrder"],
                status="pending",
            )
            self.db.add(chapter)
            self.db.flush()
            index_to_id[index] = chapter.id
            created.append(chapter)
        renumbered = renumber_outline(created)
        report.status = "outlineGenerated"
        self.db.add(report)
        self.db.commit()
        return {"reportId": report_id, "outline": [self._chapter_item(item) for item in renumbered]}

    def save_outline(self, report_id: str, payload, user: CurrentUser) -> dict:
        report = self.report_service._get_report_for_user(report_id, user)
        existing = {chapter.id: chapter for chapter in self.outlines.list_active(report.id)}
        submitted_ids: set[int] = set()
        pending_parent_links: list[tuple[ReportOutline, str | None]] = []
        chapters: list[ReportOutline] = []

        for item in payload.outline:
            chapter_id = parse_external_id("chap", item.chapter_id) if item.chapter_id else None
            if chapter_id is not None:
                chapter = existing.get(chapter_id)
                if chapter is None:
                    raise NotFoundError()
                submitted_ids.add(chapter_id)
            else:
                chapter = ReportOutline(
                    report_id=report.id,
                    status="pending",
                    chapter_no="",
                    title=item.title,
                    level=item.level,
                    sort_order=item.sort_order,
                )
                self.db.add(chapter)
                self.db.flush()
            chapter.title = item.title
            chapter.level = item.level
            chapter.sort_order = item.sort_order
            pending_parent_links.append((chapter, item.parent_id))
            chapters.append(chapter)

        new_by_temp_parent = {
            original.parent_id: chapter
            for original, chapter in zip(payload.outline, chapters)
            if original.chapter_id is None and original.parent_id
        }
        id_by_external = {to_external_id("chap", chapter.id): chapter.id for chapter in chapters}
        for chapter, parent_external in pending_parent_links:
            if parent_external is None:
                chapter.parent_id = None
            elif parent_external in id_by_external:
                chapter.parent_id = id_by_external[parent_external]
            elif parent_external in new_by_temp_parent:
                chapter.parent_id = new_by_temp_parent[parent_external].id
            else:
                chapter.parent_id = parse_external_id("chap", parent_external)

        for old_id, chapter in existing.items():
            if old_id not in submitted_ids and chapter not in chapters:
                chapter.deleted_flag = 1
                self.db.add(chapter)

        renumbered = renumber_outline(chapters)
        self.db.commit()
        return {"reportId": report_id, "outline": [self._chapter_item(item) for item in renumbered]}

    def _chapter_item(self, chapter: ReportOutline) -> dict:
        return {
            "chapterId": to_external_id("chap", chapter.id),
            "reportId": to_external_id("rpt", chapter.report_id),
            "parentId": to_external_id("chap", chapter.parent_id),
            "chapterNo": chapter.chapter_no,
            "title": chapter.title,
            "level": chapter.level,
            "sortOrder": chapter.sort_order,
            "status": chapter.status,
        }
