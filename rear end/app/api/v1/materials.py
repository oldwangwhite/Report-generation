from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.v1.templates import admin_user
from app.core.response import api_response, page_result
from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.template import StatusUpdateRequest
from app.service.material_service import MaterialService

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("")
def list_materials(
    request: Request,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1),
    major: str | None = None,
    keyword: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(admin_user),
):
    items, total = MaterialService(db).list_materials(page, size, major, keyword, status)
    return api_response(page_result(items, total, page, size), request)


@router.get("/options")
def list_material_options(
    request: Request,
    major: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    items, total = MaterialService(db).list_selectable_materials(1, 100, major, keyword)
    return api_response(page_result(items, total, 1, 100), request)


@router.get("/{material_id}")
def get_material(
    material_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(admin_user),
):
    return api_response(MaterialService(db).get_material(material_id), request)


@router.post("")
def upload_material(
    request: Request,
    materialName: str = Form(...),
    materialType: str = Form(...),
    major: str | None = Form(default=None),
    description: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(admin_user),
):
    data = MaterialService(db).upload_material(
        materialName, materialType, major, description, file, current_user
    )
    return api_response(data, request)


@router.patch("/{material_id}/status")
def update_material_status(
    material_id: str,
    payload: StatusUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(admin_user),
):
    return api_response(MaterialService(db).update_status(material_id, payload.status), request)


@router.delete("/{material_id}")
def delete_material(
    material_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(admin_user),
):
    MaterialService(db).delete_material(material_id)
    return api_response(None, request)
