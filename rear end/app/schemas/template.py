from pydantic import BaseModel


class TemplateUpdateRequest(BaseModel):
    templateName: str
    status: str
    structure: dict = {}


class StatusUpdateRequest(BaseModel):
    status: str
