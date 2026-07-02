from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import BusinessError, NotFoundError
from app.core.security import CurrentUser
from app.entity.material import Material, MaterialTag
from app.utils.datetime_utils import isoformat
from app.utils.id_utils import parse_external_id, to_external_id

ALLOWED_MATERIAL_EXTENSIONS = {"doc", "docx", "pdf", "txt", "md", "xlsx", "csv"}
PARSE_SUPPORTED_EXTENSIONS = {"txt", "md", "csv", "docx"}
DANGEROUS_CONTENT_TYPES = {
    "application/x-msdownload",
    "application/x-dosexec",
    "application/x-executable",
    "application/x-sh",
    "application/x-bat",
}
GENERAL_MAJORS = {"", "综合", "通用", "general", "common"}


class MaterialService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_materials(
        self, page: int, size: int, major: str | None, keyword: str | None, status: str | None
    ):
        query = self.db.query(Material)
        if keyword:
            query = query.filter(Material.name.like(f"%{keyword}%"))
        if major:
            ids = [
                tag.material_id
                for tag in self.db.query(MaterialTag)
                .filter(MaterialTag.tag_key == "major", MaterialTag.tag_value == major)
                .all()
            ]
            query = query.filter(Material.id.in_(ids or [-1]))
        if status:
            ids = [
                tag.material_id
                for tag in self.db.query(MaterialTag)
                .filter(MaterialTag.tag_key == "status", MaterialTag.tag_value == status)
                .all()
            ]
            query = query.filter(Material.id.in_(ids or [-1]))
        visible_ids = [
            item.id
            for item in query.order_by(Material.id.desc()).all()
            if self._status(item.id) != "deleted"
        ]
        total = len(visible_ids)
        page_ids = visible_ids[(page - 1) * size : page * size]
        items = self.db.query(Material).filter(Material.id.in_(page_ids or [-1])).all()
        item_by_id = {item.id: item for item in items}
        return [self._item(item_by_id[item_id]) for item_id in page_ids if item_id in item_by_id], total

    def list_selectable_materials(
        self, page: int, size: int, major: str | None, keyword: str | None
    ):
        query = self.db.query(Material)
        if keyword:
            query = query.filter(Material.name.like(f"%{keyword}%"))
        visible_ids = [
            item.id
            for item in query.order_by(Material.id.desc()).all()
            if self._status(item.id) == "enabled"
            and self._material_major_allowed(self._tag(item.id, "major"), major)
        ]
        total = len(visible_ids)
        page_ids = visible_ids[(page - 1) * size : page * size]
        items = self.db.query(Material).filter(Material.id.in_(page_ids or [-1])).all()
        item_by_id = {item.id: item for item in items}
        return [self._item(item_by_id[item_id]) for item_id in page_ids if item_id in item_by_id], total

    def get_material(self, material_id: str) -> dict:
        return self._item(self._get(material_id))

    def upload_material(
        self,
        material_name: str,
        material_type: str,
        major: str | None,
        description: str | None,
        file: UploadFile,
        user: CurrentUser,
    ) -> dict:
        original_filename = Path(file.filename or "").name
        file_type = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else ""
        if file_type not in ALLOWED_MATERIAL_EXTENSIONS:
            raise BusinessError(
                400,
                "Invalid request",
                {"field": "file", "reason": "material upload only supports DOC/DOCX/PDF/TXT/MD/XLSX/CSV files"},
            )
        if (file.content_type or "").lower() in DANGEROUS_CONTENT_TYPES:
            raise BusinessError(
                400,
                "Invalid request",
                {"field": "file", "reason": "dangerous file content type is not allowed"},
            )
        data = file.file.read()
        if not data:
            raise BusinessError(400, "Invalid request", {"field": "file", "reason": "empty file is not allowed"})
        max_bytes = get_settings().max_upload_size_mb * 1024 * 1024
        if len(data) > max_bytes:
            raise BusinessError(
                400,
                "Invalid request",
                {"field": "file", "reason": f"file size exceeds {get_settings().max_upload_size_mb}MB"},
            )
        upload_dir = get_settings().upload_dir / "materials"
        upload_dir.mkdir(parents=True, exist_ok=True)
        path = upload_dir / f"{uuid4().hex}.{file_type}"
        path.write_bytes(data)
        item = Material(
            name=material_name,
            type=material_type,
            file_path=str(path),
            file_size=len(data),
            file_type=file_type,
            description=description,
            created_by=user.user_id,
        )
        self.db.add(item)
        self.db.flush()
        self._set_tag(item.id, "major", major or "")
        self._set_tag(item.id, "status", "enabled")
        self._set_tag(item.id, "originalFilename", original_filename)
        self.db.commit()
        self.db.refresh(item)
        return self._item(item)

    def update_status(self, material_id: str, status: str) -> dict:
        if status not in {"enabled", "disabled"}:
            raise BusinessError(400, "Invalid request", {"field": "status", "reason": "status must be enabled or disabled"})
        item = self._get(material_id)
        self._set_tag(item.id, "status", status)
        self.db.commit()
        return self._item(item)

    def delete_material(self, material_id: str) -> None:
        item = self._get(material_id)
        self._set_tag(item.id, "status", "deleted")
        self.db.commit()

    def _get(self, material_id: str) -> Material:
        item = self.db.query(Material).filter(Material.id == parse_external_id("mat", material_id)).first()
        if item is None or self._status(item.id) == "deleted":
            raise NotFoundError()
        return item

    def _set_tag(self, material_id: int, key: str, value: str) -> None:
        tag = (
            self.db.query(MaterialTag)
            .filter(MaterialTag.material_id == material_id, MaterialTag.tag_key == key)
            .first()
        )
        if tag is None:
            tag = MaterialTag(material_id=material_id, tag_key=key, tag_value=value)
        tag.tag_value = value
        self.db.add(tag)

    def _tag(self, material_id: int, key: str) -> str | None:
        tag = (
            self.db.query(MaterialTag)
            .filter(MaterialTag.material_id == material_id, MaterialTag.tag_key == key)
            .first()
        )
        return tag.tag_value if tag else None

    def _status(self, material_id: int) -> str:
        return self._tag(material_id, "status") or "enabled"

    def _material_major_allowed(self, material_major: str | None, requested_major: str | None) -> bool:
        if not requested_major:
            return True
        normalized = (material_major or "").strip()
        return normalized in GENERAL_MAJORS or normalized == requested_major

    def _item(self, item: Material) -> dict:
        parse_supported = (item.file_type or "").lower() in PARSE_SUPPORTED_EXTENSIONS
        return {
            "materialId": to_external_id("mat", item.id),
            "materialName": item.name,
            "materialType": item.type,
            "major": self._tag(item.id, "major"),
            "fileName": self._tag(item.id, "originalFilename") or item.file_path.rsplit("\\", 1)[-1].rsplit("/", 1)[-1],
            "fileSize": item.file_size,
            "fileType": item.file_type,
            "description": item.description,
            "parseSupported": parse_supported,
            "parseStatus": "supported" if parse_supported else "uploaded_only",
            "parseMessage": (
                "Can be used for AI text extraction"
                if parse_supported
                else "Uploaded successfully, but this file type is not parsed into AI context yet"
            ),
            "status": self._status(item.id),
            "createdBy": to_external_id("usr", item.created_by),
            "createdAt": isoformat(item.created_at),
        }
