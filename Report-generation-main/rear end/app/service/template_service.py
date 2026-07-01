import re
from pathlib import Path

from docx import Document
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.ai.outline_generator import default_outline
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
        if not file.filename or not file.filename.lower().endswith(".docx"):
            raise BusinessError(
                400,
                "Invalid request",
                {"field": "file", "reason": "template upload only supports DOCX files"},
            )
        settings = get_settings()
        upload_dir = settings.upload_dir / "templates"
        upload_dir.mkdir(parents=True, exist_ok=True)
        path = upload_dir / file.filename
        path.write_bytes(file.file.read())
        structure = self._build_template_structure(path, report_type)
        item = ReportTemplate(
            template_name=template_name,
            report_type=report_type,
            file_name=file.filename,
            file_path=str(path),
            structure=structure,
            status="enabled",
            created_by=user.user_id,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self._item(item)

    def update_template(self, template_id: str, payload) -> dict:
        if payload.status not in {"enabled", "disabled"}:
            raise BusinessError(400, "Invalid request", {"field": "status", "reason": "status must be enabled or disabled"})
        item = self._get(template_id)
        item.template_name = payload.templateName
        item.status = payload.status
        item.structure = payload.structure
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self._item(item)

    def update_status(self, template_id: str, status: str) -> dict:
        if status not in {"enabled", "disabled"}:
            raise BusinessError(400, "Invalid request", {"field": "status", "reason": "status must be enabled or disabled"})
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

    def _build_template_structure(self, path: Path, report_type: str) -> dict:
        return {
            "titleStyle": "Title",
            "headingStyle": "Heading 1",
            "bodyStyle": "Normal",
            "tableStyle": "Table Grid",
            "outline": self._extract_outline_from_docx(path) or default_outline(report_type),
        }

    def _extract_outline_from_docx(self, path: Path) -> list[dict]:
        if path.suffix.lower() != ".docx" or not path.exists():
            return []
        try:
            document = Document(path)
        except Exception:
            return []

        candidates: list[tuple[str, int]] = []
        for paragraph in document.paragraphs:
            text = self._clean_heading_text(paragraph.text)
            if not text:
                continue
            style_name = paragraph.style.name if paragraph.style else ""
            level = self._heading_level(style_name, text)
            if level is None:
                continue
            candidates.append((text, level))

        if not candidates:
            return []

        root: list[dict] = []
        stack: list[dict] = []
        seen: set[tuple[str, int]] = set()
        for title, level in candidates:
            key = (title, level)
            if key in seen:
                continue
            seen.add(key)
            node = {"title": title, "level": level, "children": []}
            while stack and stack[-1]["level"] >= level:
                stack.pop()
            if stack:
                stack[-1]["children"].append(node)
            else:
                root.append(node)
            stack.append(node)
        return root

    def _heading_level(self, style_name: str, text: str) -> int | None:
        style_match = re.search(r"heading\s*(\d+)|标题\s*(\d+)", style_name, re.IGNORECASE)
        if style_match:
            value = style_match.group(1) or style_match.group(2)
            return max(1, min(int(value), 4))
        number_match = re.match(r"^(\d+(?:\.\d+)*)[、.．\s]+", text)
        if number_match:
            return min(number_match.group(1).count(".") + 1, 4)
        chinese_number_match = re.match(r"^第[一二三四五六七八九十]+[章节部分]", text)
        if chinese_number_match:
            return 1
        common_titles = {
            "前言",
            "概述",
            "检查概况",
            "检查依据",
            "检查范围",
            "检查内容",
            "检查结果",
            "问题与风险",
            "整改建议",
            "结论",
            "总结",
            "附件",
        }
        if text in common_titles:
            return 1
        return None

    def _clean_heading_text(self, text: str) -> str:
        normalized = " ".join((text or "").strip().split())
        normalized = re.sub(r"^\d+(?:\.\d+)*[、.．\s]+", "", normalized).strip()
        if not normalized or len(normalized) > 40:
            return ""
        if "{{" in normalized or "}}" in normalized:
            return ""
        return normalized

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
