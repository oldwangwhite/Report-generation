from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import BusinessError, NotFoundError
from app.core.security import CurrentUser
from app.entity.material import Material, MaterialTag
from app.utils.datetime_utils import isoformat
from app.utils.id_utils import parse_external_id, to_external_id


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
        upload_dir = get_settings().upload_dir / "materials"
        upload_dir.mkdir(parents=True, exist_ok=True)
        path = upload_dir / file.filename
        data = file.file.read()
        path.write_bytes(data)
        item = Material(
            name=material_name,
            type=material_type,
            file_path=str(path),
            file_size=len(data),
            file_type=file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "",
            description=description,
            created_by=user.user_id,
        )
        self.db.add(item)
        self.db.flush()
        self._set_tag(item.id, "major", major or "")
        self._set_tag(item.id, "status", "enabled")
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

    def _item(self, item: Material) -> dict:
        parse_supported = (item.file_type or "").lower() in {"txt", "md", "csv", "docx"}
        return {
            "materialId": to_external_id("mat", item.id),
            "materialName": item.name,
            "materialType": item.type,
            "major": self._tag(item.id, "major"),
            "fileName": item.file_path.rsplit("\\", 1)[-1].rsplit("/", 1)[-1],
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
