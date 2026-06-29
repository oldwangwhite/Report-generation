from pydantic import BaseModel, Field


class TableData(BaseModel):
    table_id: str | None = Field(default=None, alias="tableId")
    title: str
    headers: list[str]
    rows: list[list[str]]


class ContentGenerateRequest(BaseModel):
    chapter_ids: list[str] = Field(default_factory=list, alias="chapterIds")
    regenerate: bool = False
    force_overwrite: bool = Field(default=False, alias="forceOverwrite")


class ChapterContentSaveRequest(BaseModel):
    content: str
    tables: list[TableData] = Field(default_factory=list)
    manual_edited: bool = Field(default=True, alias="manualEdited")


class RegenerateChapterRequest(BaseModel):
    force_overwrite: bool = Field(default=False, alias="forceOverwrite")
    extra_prompt: str | None = Field(default=None, alias="extraPrompt")
