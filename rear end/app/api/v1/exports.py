from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.response import api_response, page_result
from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.export.file_storage import content_disposition
from app.schemas.export import ExportCreateRequest
from app.service.export_service import ExportService
from app.service.permission_service import require_permission

router = APIRouter(prefix="/reports/{report_id}/exports", tags=["exports"])


def report_export_user(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    require_permission(db, current_user, "report.export")
    return current_user


@router.post("")
def create_export(
    report_id: str,
    payload: ExportCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(report_export_user),
):
    data = ExportService(db).create_export(report_id, payload, current_user)
    return api_response(data, request)


@router.get("")
def list_exports(
    report_id: str,
    request: Request,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1),
    fileFormat: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    items, total = ExportService(db).list_exports(report_id, current_user, page, size, fileFormat)
    return api_response(page_result(items, total, page, size), request)


@router.get("/{export_id}")
def get_export(
    report_id: str,
    export_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    data = ExportService(db).get_export(report_id, export_id, current_user)
    return api_response(data, request)


@router.get("/{export_id}/download")
def download_export(
    report_id: str,
    export_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(report_export_user),
):
    path, filename, media_type = ExportService(db).get_download_path(
        report_id, export_id, current_user
    )
    return FileResponse(
        path,
        media_type=media_type,
        headers={"Content-Disposition": content_disposition(filename)},
    )