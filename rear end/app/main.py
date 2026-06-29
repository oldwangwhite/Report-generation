from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import (
    BusinessError,
    business_error_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from app.core.response import api_response
from app.core.trace import TraceIdMiddleware
from app.db.base import Base
from app.db.bootstrap import seed_reference_data
from app.db.session import SessionLocal, engine

settings = get_settings()

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TraceIdMiddleware)
app.add_exception_handler(BusinessError, business_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)


@app.get("/api/health")
def health(request: Request):
    return api_response({"status": "ok"}, request)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_reference_data(db)


from app.api.v1 import contents, exports, materials, model_config, outlines, reports, templates, users

app.include_router(reports.router, prefix="/api")
app.include_router(outlines.router, prefix="/api")
app.include_router(contents.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(materials.router, prefix="/api")
app.include_router(model_config.router, prefix="/api")
app.include_router(users.router, prefix="/api")
