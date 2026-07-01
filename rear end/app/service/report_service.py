from sqlalchemy.orm import Session

from app.core.errors import BusinessError, NotFoundError
from app.core.security import CurrentUser
from app.entity.content import ReportChapterContent
from app.entity.export import ReportExport
from app.entity.material import Material, MaterialTag
from app.entity.outline import ReportOutline
from app.entity.report import ReportRecord
from app.entity.template import ReportTemplate
from app.repository.report_repository import ReportRepository
from app.utils.datetime_utils import isoformat
from app.utils.id_utils import parse_external_id, to_external_id

REPORT_TYPES = {"summerCheck", "coalInventoryAudit"}
VALID_YEAR_MIN = 2020
VALID_YEAR_MAX = 2035
GENERAL_MAJORS = {"", "综合", "通用", "general", "common"}


class ReportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.reports = ReportRepository(db)

    def create_report(self, payload, user: CurrentUser) -> dict:
        self._validate_report_type(payload.report_type)
        self._validate_year(payload.year)
        template_id = self._validate_template(payload.template_id, payload.report_type)
        material_ids = self._validate_materials(payload.material_ids, payload.major)
        report = ReportRecord(
            report_name=payload.report_name,
            report_type=payload.report_type,
            topic=payload.topic,
            major=payload.major,
            plant=payload.plant,
            year=payload.year,
            template_id=template_id,
            material_ids=material_ids,
            created_by=user.user_id,
            status="draft",
        )
        saved = self.reports.create(report)
        return {
            "reportId": to_external_id("rpt", saved.id),
            "reportName": saved.report_name,
            "reportType": saved.report_type,
            "templateId": to_external_id("tpl", saved.template_id),
            "materialIds": [to_external_id("mat", item) for item in saved.material_ids or []],
            "status": saved.status,
        }

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
                ReportChapterContent.chapter_id.in_([item.id for item in outline] or [-1]),
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
        self._validate_year(payload.year)
        report.year = payload.year
        report.template_id = self._validate_template(payload.template_id, report.report_type)
        if payload.material_ids is not None:
            report.material_ids = self._validate_materials(payload.material_ids, report.major)
        saved = self.reports.save(report)
        return self._report_detail(saved)

    def delete_report(self, report_id: str, user: CurrentUser) -> None:
        report = self._get_report_for_user(report_id, user)
        report.deleted_flag = 1
        self.reports.save(report)

    def _parse_optional_external_id(self, prefix: str, value: str | None) -> int | None:
        if not value:
            return None
        return parse_external_id(prefix, value)

    def _parse_external_id_list(self, prefix: str, values: list[str] | None) -> list[int]:
        return [parse_external_id(prefix, value) for value in values or [] if value]

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

    def _validate_year(self, year: int | None) -> None:
        if year is None:
            return
        if year < VALID_YEAR_MIN or year > VALID_YEAR_MAX:
            raise BusinessError(
                400,
                "Invalid request",
                {"field": "year", "reason": f"year must be between {VALID_YEAR_MIN} and {VALID_YEAR_MAX}"},
            )

    def _validate_template(self, template_id: str | None, report_type: str) -> int | None:
        parsed_id = self._parse_optional_external_id("tpl", template_id)
        if parsed_id is None:
            return None
        template = (
            self.db.query(ReportTemplate)
            .filter(ReportTemplate.id == parsed_id, ReportTemplate.deleted_flag == 0)
            .first()
        )
        if template is None:
            raise BusinessError(400, "Invalid request", {"field": "templateId", "reason": "template not found"})
        if template.status != "enabled":
            raise BusinessError(400, "Invalid request", {"field": "templateId", "reason": "template is disabled"})
        if template.report_type != report_type:
            raise BusinessError(
                400,
                "Invalid request",
                {"field": "templateId", "reason": "template report type does not match"},
            )
        return template.id

    def _validate_materials(self, material_ids: list[str] | None, major: str | None) -> list[int]:
        parsed_ids = self._parse_external_id_list("mat", material_ids)
        if not parsed_ids:
            return []
        unique_ids = list(dict.fromkeys(parsed_ids))
        materials = self.db.query(Material).filter(Material.id.in_(unique_ids)).all()
        material_by_id = {item.id: item for item in materials}
        for material_id in unique_ids:
            item = material_by_id.get(material_id)
            if item is None or self._material_status(material_id) == "deleted":
                raise BusinessError(400, "Invalid request", {"field": "materialIds", "reason": "material not found"})
            if self._material_status(material_id) != "enabled":
                raise BusinessError(400, "Invalid request", {"field": "materialIds", "reason": "material is disabled"})
            material_major = (self._material_tag(material_id, "major") or "").strip()
            if major and material_major not in GENERAL_MAJORS and material_major != major:
                raise BusinessError(
                    400,
                    "Invalid request",
                    {"field": "materialIds", "reason": "material major does not match"},
                )
        return unique_ids

    def _material_tag(self, material_id: int, key: str) -> str | None:
        tag = (
            self.db.query(MaterialTag)
            .filter(MaterialTag.material_id == material_id, MaterialTag.tag_key == key)
            .first()
        )
        return tag.tag_value if tag else None

    def _material_status(self, material_id: int) -> str:
        return self._material_tag(material_id, "status") or "enabled"

    def _report_list_item(self, report: ReportRecord) -> dict:
        return {
            "reportId": to_external_id("rpt", report.id),
            "reportName": report.report_name,
            "reportType": report.report_type,
            "plant": report.plant,
            "year": report.year,
            "templateId": to_external_id("tpl", report.template_id),
            "materialIds": [to_external_id("mat", item) for item in report.material_ids or []],
            "status": report.status,
            "generatedAt": isoformat(report.generated_at),
            "createdAt": isoformat(report.created_at),
            "updatedAt": isoformat(report.updated_at),
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
            "templateId": to_external_id("tpl", report.template_id),
            "materialIds": [to_external_id("mat", item) for item in report.material_ids or []],
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
