from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=128)
    captchaId: str | None = None


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=30)
    captchaId: str | None = None
    captchaCode: str | None = None
    email: str | None = Field(default=None, max_length=128)
    phone: str | None = Field(default=None, max_length=20)
    displayName: str | None = Field(default=None, max_length=100)
    fromEmailLogin: bool = False
    fromPhoneLogin: bool = False


class SendEmailCodeRequest(BaseModel):
    email: str = Field(min_length=3, max_length=128)


class SendPhoneCodeRequest(BaseModel):
    phone: str = Field(min_length=5, max_length=20)


class CodeLoginRequest(BaseModel):
    email: str | None = None
    phone: str | None = None
    code: str = Field(min_length=1, max_length=12)


class SlideVerifyRequest(BaseModel):
    captchaId: str = Field(min_length=1, max_length=128)
    distance: int = Field(ge=0, le=300)


class ForgotVerifyRequest(BaseModel):
    contact: str = Field(min_length=3, max_length=128)
    code: str = Field(min_length=1, max_length=12)


class ForgotResetRequest(BaseModel):
    token: str = Field(min_length=1, max_length=256)
    newPassword: str = Field(min_length=8, max_length=30)
