from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.response import api_response


class BusinessError(Exception):
    def __init__(self, code: int, message: str, data: Any = None) -> None:
        self.code = code
        self.message = message
        self.data = data
        super().__init__(message)


class UnauthorizedError(BusinessError):
    def __init__(self, message: str = "未认证或凭证过期") -> None:
        super().__init__(401, message)


class ForbiddenError(BusinessError):
    def __init__(self) -> None:
        super().__init__(403, "Forbidden")


class NotFoundError(BusinessError):
    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(404, message)


class ConflictError(BusinessError):
    def __init__(self, message: str = "Conflict") -> None:
        super().__init__(409, message)


async def business_error_handler(request: Request, exc: BusinessError) -> JSONResponse:
    return JSONResponse(
        api_response(exc.data, request, code=exc.code, message=exc.message),
        status_code=exc.code if 100 <= exc.code <= 599 else 500,
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    first = exc.errors()[0] if exc.errors() else {}
    loc = first.get("loc", [])
    field = str(loc[-1]) if loc else "request"
    reason = first.get("msg", "Invalid request")
    return JSONResponse(
        api_response({"field": field, "reason": reason}, request, code=400, message="Invalid request"),
        status_code=400,
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        api_response({"errorType": "server_error"}, request, code=500, message="Server error"),
        status_code=500,
    )
