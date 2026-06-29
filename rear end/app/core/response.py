from typing import Any

from fastapi import Request

from app.core.trace import get_trace_id


def api_response(data: Any, request: Request, code: int = 200, message: str = "ok") -> dict:
    return {
        "code": code,
        "message": message,
        "data": data,
        "traceId": get_trace_id(request),
    }


def page_result(items: list, total: int, page: int, size: int) -> dict:
    return {"items": items, "total": total, "page": page, "size": size}
