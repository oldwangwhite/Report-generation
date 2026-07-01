# backend/src/utils/response.py
import uuid
import time
from fastapi.responses import JSONResponse

def generate_trace_id():
    return f"trace_{int(time.time()*1000)}{uuid.uuid4().hex[:6]}"

def success_response(data=None, message="ok"):
    return JSONResponse(content={
        "code": 200,
        "data": data,
        "message": message
    })

def error_response(http_code: int, message: str, data=None):
    return JSONResponse(
        status_code=http_code,     # HTTP 状态码直接体现错误类型
        content={
            "code": http_code,
            "data": data,
            "message": message
        }
    )