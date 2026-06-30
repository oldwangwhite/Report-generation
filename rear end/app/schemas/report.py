from pydantic import BaseModel, Field


class ReportCreateRequest(BaseModel):
    report_name: str = Field(alias="reportName")
    report_type: str = Field(alias="reportType")
    topic: str
    major: str | None = None
    plant: str | None = None
    year: int | None = None
    template_id: str | None = Field(default=None, alias="templateId")
    material_ids: list[str] = Field(default_factory=list, alias="materialIds")


class ReportUpdateRequest(BaseModel):
    report_name: str = Field(alias="reportName")
    topic: str
    major: str | None = None
    plant: str | None = None
    year: int | None = None
    template_id: str | None = Field(default=None, alias="templateId")
    material_ids: list[str] | None = Field(default=None, alias="materialIds")
