from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import BusinessError, NotFoundError
from app.core.security import CurrentUser
from app.entity.template import ReportTemplate
from app.utils.datetime_utils import isoformat
from app.utils.id_utils import parse_external_id, to_external_id


class TemplateService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_templates(self, page: int, size: int, report_type: str | None, status: str | None):
        query = self.db.query(ReportTemplate).filter(ReportTemplate.deleted_flag == 0)
        if report_type:
            query = query.filter(ReportTemplate.report_type == report_type)
        if status:
            query = query.filter(ReportTemplate.status == status)
        total = query.count()
        items = query.order_by(ReportTemplate.id.desc()).offset((page - 1) * size).limit(size).all()
        return [self._item(item) for item in items], total

    def get_template(self, template_id: str) -> dict:
        return self._item(self._get(template_id))

    def upload_template(
        self, template_name: str, report_type: str, file: UploadFile, user: CurrentUser
    ) -> dict:
        if report_type not in {"summerCheck", "coalInventoryAudit"}:
            raise BusinessError(400, "参数错误", {"field": "reportType"})
        settings = get_settings()
        upload_dir = settings.upload_dir / "templates"
        upload_dir.mkdir(parents=True, exist_ok=True)
        path = upload_dir / file.filename
        path.write_bytes(file.file.read())
        item = ReportTemplate(
            template_name=template_name,
            report_type=report_type,
            file_name=file.filename,
            file_path=str(path),
            structure={"titleStyle": "Heading1", "bodyStyle": "Normal", "tableStyle": "Table Grid"},
            status="enabled",
            created_by=user.user_id,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self._item(item)

    def update_template(self, template_id: str, payload) -> dict:
        item = self._get(template_id)
        item.template_name = payload.templateName
        item.status = payload.status
        item.structure = payload.structure
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self._item(item)

    def update_status(self, template_id: str, status: str) -> dict:
        item = self._get(template_id)
        item.status = status
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self._item(item)

    def delete_template(self, template_id: str) -> None:
        item = self._get(template_id)
        item.deleted_flag = 1
        self.db.add(item)
        self.db.commit()

    def _get(self, template_id: str) -> ReportTemplate:
        item = (
            self.db.query(ReportTemplate)
            .filter(
                ReportTemplate.id == parse_external_id("tpl", template_id),
                ReportTemplate.deleted_flag == 0,
            )
            .first()
        )
        if item is None:
            raise NotFoundError()
        return item

    def _item(self, item: ReportTemplate) -> dict:
        return {
            "templateId": to_external_id("tpl", item.id),
            "templateName": item.template_name,
            "reportType": item.report_type,
            "fileName": item.file_name,
            "status": item.status,
            "structure": item.structure or {},
            "createdBy": to_external_id("usr", item.created_by),
            "createdAt": isoformat(item.created_at),
        }
