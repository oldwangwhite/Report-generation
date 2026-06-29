from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware


def new_trace_id() -> str:
    return f"trace_{uuid4().hex}"


class TraceIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        trace_id = request.headers.get("X-Trace-Id") or new_trace_id()
        request.state.trace_id = trace_id
        response = await call_next(request)
        response.headers["X-Trace-Id"] = trace_id
        return response


def get_trace_id(request) -> str:
    return getattr(request.state, "trace_id", new_trace_id())
