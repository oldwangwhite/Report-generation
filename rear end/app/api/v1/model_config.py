from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.v1.templates import admin_user
from app.core.response import api_response
from app.db.session import get_db
from app.schemas.model_config import ModelConfigSaveRequest
from app.service.model_config_service import ModelConfigService

router = APIRouter(prefix="/admin/model-config", tags=["model-config"])


@router.get("")
def get_model_config(request: Request, db: Session = Depends(get_db), current_user=Depends(admin_user)):
    return api_response(ModelConfigService(db).get_config(), request)


@router.put("")
def save_model_config(payload: ModelConfigSaveRequest, request: Request, db: Session = Depends(get_db), current_user=Depends(admin_user)):
    return api_response(ModelConfigService(db).save_config(payload, current_user), request)


@router.post("/test")
def test_model_config(request: Request, db: Session = Depends(get_db), current_user=Depends(admin_user)):
    return api_response(ModelConfigService(db).test_connection(), request)
