from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.v1.reports import report_generate_user
from app.core.response import api_response
from app.core.security import CurrentUser
from app.db.session import get_db
from app.schemas.content import (
    ChapterContentSaveRequest,
    ContentGenerateRequest,
    RegenerateChapterRequest,
)
from app.service.content_generation_service import ContentGenerationService

router = APIRouter(prefix="/reports/{report_id}", tags=["contents"])


@router.post("/content/generate")
def generate_content(
    report_id: str,
    payload: ContentGenerateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(report_generate_user),
):
    stream = ContentGenerationService(db).stream_generate(report_id, payload, current_user)
    return StreamingResponse(stream, media_type="text/event-stream")


@router.put("/chapters/{chapter_id}/content")
def save_chapter_content(
    report_id: str,
    chapter_id: str,
    payload: ChapterContentSaveRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(report_generate_user),
):
    data = ContentGenerationService(db).save_content(report_id, chapter_id, payload, current_user)
    return api_response(data, request)


@router.post("/chapters/{chapter_id}/regenerate")
def regenerate_chapter(
    report_id: str,
    chapter_id: str,
    payload: RegenerateChapterRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(report_generate_user),
):
    stream = ContentGenerationService(db).stream_regenerate(
        report_id, chapter_id, payload, current_user
    )
    return StreamingResponse(stream, media_type="text/event-stream")