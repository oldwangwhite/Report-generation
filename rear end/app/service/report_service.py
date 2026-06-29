from sqlalchemy.orm import Session

from app.core.errors import BusinessError, NotFoundError
from app.core.security import CurrentUser
from app.entity.content import ReportChapterContent
from app.entity.export import ReportExport
from app.entity.outline import ReportOutline
from app.entity.report import ReportRecord
from app.repository.report_repository import ReportRepository
from app.utils.datetime_utils import isoformat
from app.utils.id_utils import parse_external_id, to_external_id

REPORT_TYPES = {"summerCheck", "coalInventoryAudit"}


class ReportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.reports = ReportRepository(db)

    def create_report(self, payload, user: CurrentUser) -> dict:
        self._validate_report_type(payload.report_type)
        report = ReportRecord(
            report_name=payload.report_name,
            report_type=payload.report_type,
            topic=payload.topic,
            major=payload.major,
            plant=payload.plant,
            year=payload.year,
            created_by=user.user_id,
            status="draft",
        )
        saved = self.reports.create(report)
        return self._report_detail(saved)

    def list_reports(
        self,
        user: CurrentUser,
        page: int,
        size: int,
        keyword: str | None,
        report_type: str | None,
        status: str | None,
    ) -> tuple[list[dict], int]:
        owner = user.user_id if user.role == "user" else None
        items, total = self.reports.list_active(
            created_by=owner,
            page=max(page, 1),
            size=max(min(size, 100), 1),
            keyword=keyword,
            report_type=report_type,
            status=status,
        )
        return [self._report_list_item(item) for item in items], total

    def get_report_detail(self, report_id: str, user: CurrentUser) -> dict:
        report = self._get_report_for_user(report_id, user)
        outline = (
            self.db.query(ReportOutline)
            .filter(ReportOutline.report_id == report.id, ReportOutline.deleted_flag == 0)
            .order_by(ReportOutline.chapter_no)
            .all()
        )
        contents = (
            self.db.query(ReportChapterContent)
            .filter(
                ReportChapterContent.report_id == report.id,
                ReportChapterContent.deleted_flag == 0,
            )
            .all()
        )
        latest_export = (
            self.db.query(ReportExport)
            .filter(ReportExport.report_id == report.id, ReportExport.deleted_flag == 0)
            .order_by(ReportExport.created_at.desc(), ReportExport.id.desc())
            .first()
        )
        return {
            "report": self._report_detail(report),
            "outline": [self._chapter_item(item) for item in outline],
            "contents": [self._content_item(item) for item in contents],
            "latestExport": self._export_item(latest_export) if latest_export else None,
        }

    def update_report(self, report_id: str, payload, user: CurrentUser) -> dict:
        report = self._get_report_for_user(report_id, user)
        report.report_name = payload.report_name
        report.topic = payload.topic
        report.major = payload.major
        report.plant = payload.plant
        report.year = payload.year
        saved = self.reports.save(report)
        return self._report_detail(saved)

    def delete_report(self, report_id: str, user: CurrentUser) -> None:
        report = self._get_report_for_user(report_id, user)
        report.deleted_flag = 1
        self.reports.save(report)

    def _get_report_for_user(self, report_id: str, user: CurrentUser) -> ReportRecord:
        report = self.reports.get_active(parse_external_id("rpt", report_id))
        if report is None:
            raise NotFoundError()
        if user.role == "user" and report.created_by != user.user_id:
            raise NotFoundError()
        return report

    def _validate_report_type(self, report_type: str) -> None:
        if report_type not in REPORT_TYPES:
            raise BusinessError(
                400,
                "参数错误",
                {"field": "reportType", "reason": "不支持的报告类型"},
            )

    def _report_list_item(self, report: ReportRecord) -> dict:
        return {
            "reportId": to_external_id("rpt", report.id),
            "reportName": report.report_name,
            "reportType": report.report_type,
            "plant": report.plant,
            "year": report.year,
            "status": report.status,
            "generatedAt": isoformat(report.generated_at),
            "createdAt": isoformat(report.created_at),
        }

    def _report_detail(self, report: ReportRecord) -> dict:
        return {
            "reportId": to_external_id("rpt", report.id),
            "reportName": report.report_name,
            "reportType": report.report_type,
            "topic": report.topic,
            "major": report.major,
            "plant": report.plant,
            "year": report.year,
            "status": report.status,
            "createdBy": to_external_id("usr", report.created_by),
            "createdAt": isoformat(report.created_at),
            "generatedAt": isoformat(report.generated_at),
            "updatedAt": isoformat(report.updated_at),
        }

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

    def _content_item(self, content: ReportChapterContent) -> dict:
        return {
            "chapterId": to_external_id("chap", content.chapter_id),
            "content": content.content,
            "tables": content.tables or [],
            "manualEdited": content.manual_edited,
            "status": content.status,
            "updatedAt": isoformat(content.updated_at),
        }

    def _export_item(self, item: ReportExport) -> dict:
        return {
            "exportId": to_external_id("exp", item.id),
            "reportId": to_external_id("rpt", item.report_id),
            "fileName": item.file_name,
            "fileFormat": item.file_format,
            "fileSize": item.file_size,
            "downloadUrl": f"/api/reports/{to_external_id('rpt', item.report_id)}/exports/"
            f"{to_external_id('exp', item.id)}/download",
            "status": item.status,
            "createdAt": isoformat(item.created_at),
        }
