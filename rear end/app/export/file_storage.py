from pathlib import Path
from urllib.parse import quote

from app.core.config import get_settings


def export_dir() -> Path:
    path = get_settings().export_dir
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_report_filename(name: str, file_format: str) -> str:
    cleaned = "".join(ch for ch in name if ch not in "\\/:*?\"<>|").strip()
    return f"{cleaned or 'report'}.{file_format}"


def content_disposition(filename: str) -> str:
    return f"attachment; filename*=UTF-8''{quote(filename)}"
