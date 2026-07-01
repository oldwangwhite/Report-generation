from pydantic import BaseModel, Field


class UserRoleUpdateRequest(BaseModel):
    role: str


class UserStatusUpdateRequest(BaseModel):
    status: str


class RolePermissionsUpdateRequest(BaseModel):
    permission_codes: list[str] = Field(default_factory=list, alias="permissionCodes")