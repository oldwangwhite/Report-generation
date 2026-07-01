from typing import Literal

from pydantic import BaseModel, Field


class ExportCreateRequest(BaseModel):
    template_id: str | None = Field(default=None, alias="templateId")
    file_format: Literal["docx", "md", "txt"] = Field(default="docx", alias="fileFormat")
    use_latest_saved_content: bool = Field(default=True, alias="useLatestSavedContent")
