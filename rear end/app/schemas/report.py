from pydantic import BaseModel, Field


class ReportCreateRequest(BaseModel):
    report_name: str = Field(alias="reportName")
    report_type: str = Field(alias="reportType")
    topic: str
    major: str | None = None
    plant: str | None = None
    year: int | None = None


class ReportUpdateRequest(BaseModel):
    report_name: str = Field(alias="reportName")
    topic: str
    major: str | None = None
    plant: str | None = None
    year: int | None = None
