from pydantic import BaseModel


class ModelConfigSaveRequest(BaseModel):
    apiUrl: str
    modelName: str
    apiKey: str | None = None
    timeoutSeconds: int = 120
    enabled: bool = True
