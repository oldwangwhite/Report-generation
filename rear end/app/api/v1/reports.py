from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.response import api_response, page_result
from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.report import ReportCreateRequest, ReportUpdateRequest
from app.service.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("")
def create_report(
    payload: ReportCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    data = ReportService(db).create_report(payload, current_user)
    return api_response(data, request)


@router.get("")
def list_reports(
    request: Request,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1),
    keyword: str | None = None,
    reportType: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    items, total = ReportService(db).list_reports(
        current_user, page, size, keyword, reportType, status
    )
    return api_response(page_result(items, total, page, size), request)


@router.get("/{report_id}")
def get_report(
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    data = ReportService(db).get_report_detail(report_id, current_user)
    return api_response(data, request)


@router.put("/{report_id}")
def update_report(
    report_id: str,
    payload: ReportUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    data = ReportService(db).update_report(report_id, payload, current_user)
    return api_response(data, request)


@router.delete("/{report_id}")
def delete_report(
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    ReportService(db).delete_report(report_id, current_user)
    return api_response(None, request)
