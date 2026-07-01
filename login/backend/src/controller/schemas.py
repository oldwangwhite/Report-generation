# backend/src/schemas.py
from pydantic import BaseModel, Field
from typing import Optional

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(...)
    captchaId: Optional[str] = None        # 允许为空
    captchaCode: Optional[str] = None      # 允许为空
    email: Optional[str] = None
    emailCode: Optional[str] = None
    phone: Optional[str] = None            # 允许为空
    displayName: Optional[str] = None
    fromEmailLogin: Optional[bool] = False
    fromPhoneLogin: Optional[bool] = False

class LoginRequest(BaseModel):
    username: str
    password: str
    captchaId: str = Field(..., description="验证码ID")

class EmailLoginRequest(BaseModel):
    email: str
    code: str   # 邮箱验证码