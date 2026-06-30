from pydantic import BaseModel, Field


class OutlineGenerateRequest(BaseModel):
    report_type: str | None = Field(default=None, alias="reportType")
    topic: str | None = None
    template_id: str | None = Field(default=None, alias="templateId")
    material_ids: list[str] = Field(default_factory=list, alias="materialIds")


class ChapterItemRequest(BaseModel):
    chapter_id: str | None = Field(default=None, alias="chapterId")
    parent_id: str | None = Field(default=None, alias="parentId")
    chapter_no: str | None = Field(default=None, alias="chapterNo")
    title: str
    level: int
    sort_order: int = Field(alias="sortOrder")


class OutlineSaveRequest(BaseModel):
    outline: list[ChapterItemRequest]
