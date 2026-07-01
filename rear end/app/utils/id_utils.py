from app.core.errors import NotFoundError


def to_external_id(prefix: str, value: int | None) -> str | None:
    if value is None:
        return None
    return f"{prefix}_{value:03d}"


def parse_external_id(prefix: str, value: str) -> int:
    if value.isdigit():
        return int(value)
    marker = f"{prefix}_"
    if not value.startswith(marker):
        raise NotFoundError()
    raw = value.removeprefix(marker)
    if not raw.isdigit():
        raise NotFoundError()
    return int(raw)
