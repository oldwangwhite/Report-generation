import base64
import secrets
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.response import api_response
from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.entity.user import User
from app.schemas.auth import (
    CodeLoginRequest,
    ForgotResetRequest,
    ForgotVerifyRequest,
    LoginRequest,
    RegisterRequest,
    SendEmailCodeRequest,
    SendPhoneCodeRequest,
    SlideVerifyRequest,
)
from app.service.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

_captcha_store: dict[str, tuple[str, datetime]] = {}
_slide_store: dict[str, tuple[int, datetime, bool]] = {}
_code_store: dict[str, tuple[str, datetime]] = {}
_reset_store: dict[str, tuple[str, datetime]] = {}


def _code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def _svg_data_uri(svg: str) -> str:
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def _purge_expired() -> None:
    now = datetime.utcnow()
    for store in (_captcha_store, _code_store, _reset_store):
        for key, (_, expires_at) in list(store.items()):
            if expires_at < now:
                store.pop(key, None)
    for key, (_, expires_at, _) in list(_slide_store.items()):
        if expires_at < now:
            _slide_store.pop(key, None)


def _verify_captcha(captcha_id: str | None, code: str | None) -> bool:
    if not captcha_id or not code:
        return False
    _purge_expired()
    item = _captcha_store.pop(captcha_id, None)
    return bool(item and item[0].lower() == code.lower())


def _store_code(kind: str, target: str) -> str:
    dev_code = _code()
    _code_store[f"{kind}:{target}"] = (dev_code, datetime.utcnow() + timedelta(minutes=5))
    return dev_code


def _verify_code(kind: str, target: str | None, code: str) -> bool:
    if not target:
        return False
    _purge_expired()
    item = _code_store.get(f"{kind}:{target}")
    return bool(item and item[0] == code)


@router.post("/register")
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if not payload.fromEmailLogin and not payload.fromPhoneLogin:
        if (payload.captchaId or payload.captchaCode) and not _verify_captcha(
            payload.captchaId, payload.captchaCode
        ):
            return api_response(None, request, code=400, message="验证码错误")
    data = AuthService(db).register(
        username=payload.username,
        password=payload.password,
        email=payload.email,
        phone=payload.phone,
        display_name=payload.displayName,
    )
    return api_response(data, request, message="注册成功")


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    if payload.captchaId:
        item = _slide_store.get(payload.captchaId)
        if item and not item[2]:
            return api_response(None, request, code=400, message="请先完成滑块验证")
    client_ip = request.client.host if request.client else None
    data = AuthService(db).login(payload.username, payload.password, client_ip)
    return api_response(data, request, message="登录成功")


@router.post("/login/email")
def login_by_email(payload: CodeLoginRequest, request: Request, db: Session = Depends(get_db)):
    if not _verify_code("email", payload.email, payload.code):
        return api_response(None, request, code=400, message="验证码错误")
    client_ip = request.client.host if request.client else None
    return api_response(
        AuthService(db).login_by_email(payload.email or "", client_ip),
        request,
        message="登录成功",
    )


@router.post("/login/phone")
def login_by_phone(payload: CodeLoginRequest, request: Request, db: Session = Depends(get_db)):
    if not _verify_code("phone", payload.phone, payload.code):
        return api_response(None, request, code=400, message="验证码错误")
    client_ip = request.client.host if request.client else None
    return api_response(
        AuthService(db).login_by_phone(payload.phone or "", client_ip),
        request,
        message="登录成功",
    )


@router.post("/email/send-code")
def send_email_code(payload: SendEmailCodeRequest, request: Request):
    dev_code = _store_code("email", payload.email)
    return api_response({"devCode": dev_code}, request, message="验证码已发送")


@router.post("/phone/send-code")
def send_phone_code(payload: SendPhoneCodeRequest, request: Request):
    dev_code = _store_code("phone", payload.phone)
    return api_response({"devCode": dev_code}, request, message="验证码已发送")


@router.get("/me")
def me(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if user is not None:
        return api_response(AuthService(db).current_user_result(user), request)
    return api_response(
        {
            "userId": current_user.external_id,
            "username": current_user.username,
            "role": current_user.role,
            "displayName": current_user.display_name,
        },
        request,
    )


@router.post("/logout")
def logout(request: Request, current_user: CurrentUser = Depends(get_current_user)):
    return api_response(None, request, message="退出成功")


@router.get("/captcha/slide")
def slide_captcha(request: Request):
    captcha_id = secrets.token_urlsafe(12)
    x = secrets.randbelow(130) + 80
    y = secrets.randbelow(100) + 40
    _slide_store[captcha_id] = (x, datetime.utcnow() + timedelta(minutes=5), False)
    bg = _svg_data_uri(
        f"""
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#e8f3ff"/>
              <stop offset="1" stop-color="#d9f7be"/>
            </linearGradient>
          </defs>
          <rect width="300" height="200" fill="url(#g)"/>
          <circle cx="65" cy="58" r="28" fill="#91caff" opacity=".7"/>
          <circle cx="235" cy="142" r="36" fill="#95de64" opacity=".55"/>
          <rect x="{x}" y="{y}" width="50" height="50" rx="8" fill="#ffffff" opacity=".85" stroke="#1677ff" stroke-width="2" stroke-dasharray="6 4"/>
          <text x="150" y="112" text-anchor="middle" font-size="18" fill="#59758f">拖动滑块完成验证</text>
        </svg>
        """
    )
    slider = _svg_data_uri(
        """
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
          <rect width="50" height="50" rx="8" fill="#1677ff"/>
          <path d="M18 14l12 11-12 11" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        """
    )
    return api_response(
        {
            "captchaId": captcha_id,
            "bgImage": bg,
            "backgroundImage": bg,
            "sliderImage": slider,
            "y": y,
        },
        request,
    )


@router.post("/captcha/slide/verify")
def verify_slide_captcha(payload: SlideVerifyRequest, request: Request):
    _purge_expired()
    item = _slide_store.get(payload.captchaId)
    if item is None:
        return api_response({"valid": False}, request, code=400, message="验证码已过期")
    target, expires_at, _ = item
    if abs(payload.distance - target) > 8:
        return api_response({"valid": False}, request, code=400, message="验证失败")
    _slide_store[payload.captchaId] = (target, expires_at, True)
    return api_response({"valid": True}, request)


@router.get("/captcha")
def captcha(request: Request):
    captcha_id = secrets.token_urlsafe(12)
    value = _code(4)
    _captcha_store[captcha_id] = (value, datetime.utcnow() + timedelta(minutes=5))
    svg = _svg_data_uri(
        f"""
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="40">
          <rect width="120" height="40" rx="6" fill="#f0f7ff"/>
          <path d="M4 30 C30 0, 80 50, 116 10" fill="none" stroke="#91caff" stroke-width="2"/>
          <text x="60" y="27" text-anchor="middle" font-size="22" font-family="Arial" fill="#1d4ed8" letter-spacing="5">{value}</text>
        </svg>
        """
    )
    return api_response(
        {"captchaId": captcha_id, "captchaImage": svg, "image": svg, "devCode": value},
        request,
    )


@router.post("/forgot-password/verify")
def forgot_verify(payload: ForgotVerifyRequest, request: Request, db: Session = Depends(get_db)):
    kind = "email" if "@" in payload.contact else "phone"
    if not _verify_code(kind, payload.contact, payload.code):
        return api_response(None, request, code=400, message="验证码错误")
    data = AuthService(db).create_reset_token(payload.contact)
    _reset_store[data["token"]] = (data["username"], datetime.utcnow() + timedelta(minutes=10))
    return api_response(data, request)


@router.post("/forgot-password/reset")
def forgot_reset(payload: ForgotResetRequest, request: Request, db: Session = Depends(get_db)):
    _purge_expired()
    item = _reset_store.pop(payload.token, None)
    if item is None:
        return api_response(None, request, code=401, message="重置令牌已过期或无效")
    username, _ = item
    AuthService(db).reset_password(username, payload.newPassword)
    return api_response(None, request, message="密码重置成功")
