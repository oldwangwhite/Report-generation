from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.v1.reports import report_generate_user
from app.core.response import api_response
from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.outline import OutlineGenerateRequest, OutlineSaveRequest
from app.service.outline_service import OutlineService

router = APIRouter(prefix="/reports/{report_id}/outline", tags=["outlines"])


@router.post("/generate")
def generate_outline(
    report_id: str,
    payload: OutlineGenerateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(report_generate_user),
):
    data = OutlineService(db).generate_outline(report_id, payload, current_user)
    return api_response(data, request)


@router.put("")
def save_outline(
    report_id: str,
    payload: OutlineSaveRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(report_generate_user),
):
    data = OutlineService(db).save_outline(report_id, payload, current_user)
    return api_response(data, request)