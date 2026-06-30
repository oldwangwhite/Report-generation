from pathlib import Path

from sqlalchemy.orm import Session

from app.core.errors import BusinessError, NotFoundError
from app.core.security import CurrentUser
from app.entity.content import ReportChapterContent
from app.entity.export import ReportExport
from app.entity.outline import ReportOutline
from app.entity.template import ReportTemplate
from app.export.docx_builder import DocxBuilder
from app.export.file_storage import export_dir, safe_report_filename
from app.export.markdown_builder import build_markdown
from app.export.text_builder import build_text
from app.repository.export_repository import ExportRepository
from app.service.report_service import ReportService
from app.utils.datetime_utils import isoformat
from app.utils.id_utils import parse_external_id, to_external_id


class ExportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.report_service = ReportService(db)
        self.exports = ExportRepository(db)

    def create_export(self, report_id: str, payload, user: CurrentUser) -> dict:
        report = self.report_service._get_report_for_user(report_id, user)
        file_format = payload.file_format or "docx"
        if file_format not in {"docx", "md", "txt"}:
            raise BusinessError(
                400, "参数错误", {"field": "fileFormat", "reason": "不支持的导出格式"}
            )
        item = self.exports.create(
            ReportExport(report_id=report.id, file_format=file_format, status="exporting")
        )
        filename = safe_report_filename(report.report_name, file_format)
        path = export_dir() / f"{item.id:03d}_{filename}"
        try:
            self._build_file(report, file_format, path, payload.template_id)
            item.file_name = filename
            item.file_path = str(path)
            item.file_size = path.stat().st_size
            item.status = "exported"
        except Exception as exc:
            item.status = "exportFailed"
            item.error_message = str(exc)
        self.exports.save(item)
        if item.status == "exportFailed":
            raise BusinessError(
                500,
                "文件导出失败",
                {"errorType": "export_failed", "reason": item.error_message},
            )
        return {
            "exportId": to_external_id("exp", item.id),
            "reportId": report_id,
            "status": "exporting",
        }

    def get_export(self, report_id: str, export_id: str, user: CurrentUser) -> dict:
        report = self.report_service._get_report_for_user(report_id, user)
        item = self._get_export_item(report.id, export_id)
        return self._export_item(item)

    def list_exports(
        self, report_id: str, user: CurrentUser, page: int, size: int, file_format: str | None
    ) -> tuple[list[dict], int]:
        report = self.report_service._get_report_for_user(report_id, user)
        items, total = self.exports.list_active(report.id, page, size, file_format)
        return [self._export_item(item) for item in items], total

    def get_download_path(self, report_id: str, export_id: str, user: CurrentUser) -> tuple[Path, str, str]:
        report = self.report_service._get_report_for_user(report_id, user)
        item = self._get_export_item(report.id, export_id)
        path = Path(item.file_path or "")
        if item.status != "exported" or not path.exists():
            raise NotFoundError()
        media_types = {
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "md": "text/markdown; charset=utf-8",
            "txt": "text/plain; charset=utf-8",
        }
        return path, item.file_name or path.name, media_types.get(item.file_format, "application/octet-stream")

    def _build_file(self, report, file_format: str, path: Path, template_id: str | None = None) -> None:
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
        contents_by_chapter = {content.chapter_id: content for content in contents}
        if file_format == "docx":
            template = self._select_template(report.report_type, template_id)
            DocxBuilder().build(report, outline, contents_by_chapter, path, template)
        elif file_format == "md":
            build_markdown(report, outline, contents_by_chapter, path)
        elif file_format == "txt":
            build_text(report, outline, contents_by_chapter, path)

    def _select_template(self, report_type: str, template_id: str | None = None) -> ReportTemplate | None:
        query = self.db.query(ReportTemplate).filter(
            ReportTemplate.deleted_flag == 0,
            ReportTemplate.status == "enabled",
        )
        if template_id:
            try:
                parsed_id = parse_external_id("tpl", template_id)
            except ValueError:
                parsed_id = -1
            item = query.filter(ReportTemplate.id == parsed_id).first()
            if item is not None:
                return item
        return (
            query.filter(ReportTemplate.report_type == report_type)
            .order_by(ReportTemplate.id.desc())
            .first()
        )

    def _get_export_item(self, report_id: int, export_id: str) -> ReportExport:
        item = self.exports.get_active(report_id, parse_external_id("exp", export_id))
        if item is None:
            raise NotFoundError()
        return item

    def _export_item(self, item: ReportExport) -> dict:
        report_id = to_external_id("rpt", item.report_id)
        export_id = to_external_id("exp", item.id)
        return {
            "exportId": export_id,
            "reportId": report_id,
            "fileName": item.file_name,
            "fileFormat": item.file_format,
            "fileSize": item.file_size,
            "downloadUrl": f"/api/reports/{report_id}/exports/{export_id}/download",
            "status": item.status,
            "createdAt": isoformat(item.created_at),
        }
