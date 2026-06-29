from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.response import api_response, page_result
from app.core.security import CurrentUser, get_current_user, require_admin
from app.db.session import get_db
from app.schemas.template import StatusUpdateRequest, TemplateUpdateRequest
from app.service.template_service import TemplateService

router = APIRouter(prefix="/templates", tags=["templates"])


def admin_user(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    require_admin(current_user)
    return current_user


@router.get("")
def list_templates(
    request: Request,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1),
    reportType: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    items, total = TemplateService(db).list_templates(page, size, reportType, status)
    return api_response(page_result(items, total, page, size), request)


@router.get("/{template_id}")
def get_template(template_id: str, request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return api_response(TemplateService(db).get_template(template_id), request)


@router.post("")
def upload_template(
    request: Request,
    templateName: str = Form(...),
    reportType: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(admin_user),
):
    data = TemplateService(db).upload_template(templateName, reportType, file, current_user)
    return api_response(data, request)


@router.put("/{template_id}")
def update_template(template_id: str, payload: TemplateUpdateRequest, request: Request, db: Session = Depends(get_db), current_user=Depends(admin_user)):
    return api_response(TemplateService(db).update_template(template_id, payload), request)


@router.patch("/{template_id}/status")
def update_template_status(template_id: str, payload: StatusUpdateRequest, request: Request, db: Session = Depends(get_db), current_user=Depends(admin_user)):
    return api_response(TemplateService(db).update_status(template_id, payload.status), request)


@router.delete("/{template_id}")
def delete_template(template_id: str, request: Request, db: Session = Depends(get_db), current_user=Depends(admin_user)):
    TemplateService(db).delete_template(template_id)
    return api_response(None, request)
