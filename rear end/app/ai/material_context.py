from pathlib import Path

from docx import Document
from sqlalchemy.orm import Session

from app.entity.material import Material, MaterialTag

MAX_MATERIALS = 5
MAX_CHARS_PER_MATERIAL = 800
MAX_CONTEXT_CHARS = 2400


def build_material_context(db: Session, major: str | None) -> str:
    materials = _active_materials(db, major)
    blocks: list[str] = []
    for item in materials[:MAX_MATERIALS]:
        major_tag = _tag(db, item.id, "major") or "未指定专业"
        text = _extract_material_text(item)
        if not text:
            text = item.description or "该素材暂无法提取正文，可参考素材名称和类型。"
        text = _compact(text)[:MAX_CHARS_PER_MATERIAL]
        blocks.append(
            f"素材名称：{item.name}\n素材类型：{item.type}\n适用专业：{major_tag}\n素材摘要：{text}"
        )
    return "\n\n".join(blocks)[:MAX_CONTEXT_CHARS]


def _active_materials(db: Session, major: str | None) -> list[Material]:
    active_ids = [
        row.material_id
        for row in db.query(MaterialTag)
        .filter(MaterialTag.tag_key == "status", MaterialTag.tag_value == "enabled")
        .all()
    ]
    query = db.query(Material).filter(Material.id.in_(active_ids or [-1]))
    if major:
        major_ids = [
            row.material_id
            for row in db.query(MaterialTag)
            .filter(MaterialTag.tag_key == "major", MaterialTag.tag_value == major)
            .all()
        ]
        if major_ids:
            query = query.filter(Material.id.in_(major_ids))
    return query.order_by(Material.id.desc()).all()


def _tag(db: Session, material_id: int, key: str) -> str | None:
    tag = (
        db.query(MaterialTag)
        .filter(MaterialTag.material_id == material_id, MaterialTag.tag_key == key)
        .first()
    )
    return tag.tag_value if tag else None


def _extract_material_text(item: Material) -> str:
    path = Path(item.file_path or "")
    if not path.exists() or not path.is_file():
        return ""
    suffix = path.suffix.lower()
    try:
        if suffix in {".txt", ".md", ".csv"}:
            return _read_text_file(path)
        if suffix == ".docx":
            document = Document(path)
            paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
            return "\n".join(paragraphs)
    except Exception:
        return ""
    return ""


def _read_text_file(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "gbk"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_bytes().decode("utf-8", errors="ignore")


def _compact(text: str) -> str:
    return " ".join(text.split())