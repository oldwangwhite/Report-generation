from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from datetime import datetime

from src.config.database import get_db
from src.utils.redis_client import redis_client
from src.utils.response import success_response, error_response
from src.utils.error_codes import ErrorCode
from src.service.service import (
    register_user, login_user, login_by_email, login_by_phone,
    generate_reset_token, store_reset_token, verify_reset_token, change_password
)
from src.utils.slide_captcha import generate_slide_captcha, verify_slide_captcha
from src.utils.captcha_service import generate_captcha, verify_captcha
from src.utils.utils import create_access_token
from src.utils.email_code import send_email_code, verify_email_code
from src.utils.phone_code import send_phone_code, verify_phone_code
from src.utils.password_validator import validate_password_strength
from src.utils.dependencies import get_current_user
from src.entity.models import User, Role
from src.controller import schemas

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---------- 请求体模型 ----------
class SlideVerifyRequest(BaseModel):
    captchaId: str
    distance: int

class SendEmailCodeRequest(BaseModel):
    email: str

class EmailLoginRequest(BaseModel):
    email: str
    code: str

class SendPhoneCodeRequest(BaseModel):
    phone: str

class PhoneLoginRequest(BaseModel):
    phone: str
    code: str

class ForgotVerifyRequest(BaseModel):
    contact: str
    code: str


# ========== 注册（支持邮箱/手机快捷注册） ==========
@router.post("/register")
async def register(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    print("收到注册请求:", body)

    from_email = body.get("fromEmailLogin", False)
    from_phone = body.get("fromPhoneLogin", False)
    username = body.get("username")
    password = body.get("password")
    phone = body.get("phone")
    email = body.get("email")
    # 将空字符串转为 None，避免误判
    if phone == "":
        phone = None
    if email == "":
        email = None
    display_name = body.get("displayName")

    # 普通注册：图形验证码、手机号、邮箱必填
    if not from_email and not from_phone:
        if not username or not password:
            return error_response(400, "用户名和密码不能为空")
        if not phone:
            return error_response(400, "手机号不能为空")
        if not email:
            return error_response(400, "邮箱不能为空")
        captcha_id = body.get("captchaId")
        captcha_code = body.get("captchaCode")
        if not captcha_id or not captcha_code:
            return error_response(400, "缺少验证码")
        if not await verify_captcha(captcha_id, captcha_code):
            return error_response(400, "验证码错误")
    else:
        # 快捷注册：用户名、密码必填，对应的联系方式必填
        if not username or not password:
            return error_response(400, "用户名和密码不能为空")
        if from_phone and not phone:
            return error_response(400, "手机号不能为空")
        if from_email and not email:
            return error_response(400, "邮箱不能为空")
        # 跳过图形验证码、对立联系方式

    user, err = register_user(
        db, username=username, password=password,
        email=email, phone=phone, display_name=display_name
    )
    print("register_user 返回错误:", err)
    if err:
        return error_response(400, err)

    # 手机快捷注册时标记手机已验证
    if from_phone and phone:
        user.phone_verified = True
        db.commit()

    # 自动登录
    user.last_login_at = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    db.commit()

    role = db.query(Role).filter(Role.id == user.role_id).first()
    access_token = create_access_token(data={
        "sub": str(user.id),
        "username": user.username,
        "role": role.name if role else "user"
    })
    user_data = {
        "userId": f"usr_{user.id:03d}",
        "username": user.username,
        "role": role.name,
        "displayName": user.display_name
    }
    return success_response({
        "accessToken": access_token,
        "expiresIn": 7200,
        "user": user_data
    })


# ========== 密码登录 ==========
@router.post("/login")
async def login(req: schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    access_token, err, err_code = await login_user(
        db, username=req.username, password=req.password,
        captcha_id=req.captchaId, ip_address=request.client.host
    )
    if err:
        return error_response(err_code or ErrorCode.UNAUTHORIZED, err)

    user = db.query(User).filter(
        or_(User.username == req.username, User.phone == req.username, User.email == req.username)
    ).first()
    user_data = {
        "userId": f"usr_{user.id:03d}",
        "username": user.username,
        "role": user.role.name,
        "displayName": user.display_name
    }
    return success_response({
        "accessToken": access_token,
        "expiresIn": 7200,
        "user": user_data
    })


# ========== 邮箱验证码登录 ==========
@router.post("/login/email")
async def email_login(req: EmailLoginRequest, request: Request, db: Session = Depends(get_db)):
    access_token, err, err_code = await login_by_email(
        db, email=req.email, code=req.code, ip_address=request.client.host
    )
    if err:
        return error_response(err_code or ErrorCode.UNAUTHORIZED, err)

    user = db.query(User).filter(User.email == req.email).first()
    user_data = {
        "userId": f"usr_{user.id:03d}",
        "username": user.username,
        "role": user.role.name,
        "displayName": user.display_name
    }
    return success_response({
        "accessToken": access_token,
        "expiresIn": 7200,
        "user": user_data
    })


# ========== 手机验证码登录 ==========
@router.post("/login/phone")
async def phone_login(req: PhoneLoginRequest, request: Request, db: Session = Depends(get_db)):
    access_token, err, err_code = await login_by_phone(
        db, phone=req.phone, code=req.code, ip_address=request.client.host
    )
    if err:
        return error_response(err_code or ErrorCode.UNAUTHORIZED, err)

    user = db.query(User).filter(User.phone == req.phone).first()
    user_data = {
        "userId": f"usr_{user.id:03d}",
        "username": user.username,
        "role": user.role.name,
        "displayName": user.display_name
    }
    return success_response({
        "accessToken": access_token,
        "expiresIn": 7200,
        "user": user_data
    })


# ========== 发送邮箱验证码 ==========
@router.post("/email/send-code")
async def send_email_code_route(req: SendEmailCodeRequest):
    success = await send_email_code(req.email)
    if not success:
        return error_response(ErrorCode.BAD_REQUEST, "操作频繁，请稍后再试")
    return success_response(None, "验证码已发送")


# ========== 发送手机验证码 ==========
@router.post("/phone/send-code")
async def send_phone_code_route(req: SendPhoneCodeRequest):
    success = await send_phone_code(req.phone)
    if not success:
        return error_response(ErrorCode.BAD_REQUEST, "操作频繁，请稍后再试")
    return success_response(None, "验证码已发送")


# ========== 获取当前用户 ==========
@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return success_response({
        "userId": f"usr_{current_user.id:03d}",
        "username": current_user.username,
        "role": current_user.role.name,
        "displayName": current_user.display_name
    })


# ========== 退出登录 ==========
@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return success_response(None)


# ========== 滑块验证码（密码登录使用） ==========
@router.get("/captcha/slide")
async def get_slide_captcha():
    data = await generate_slide_captcha()
    return success_response(data)

@router.post("/captcha/slide/verify")
async def post_slide_verify(req: SlideVerifyRequest):
    ok = await verify_slide_captcha(req.captchaId, req.distance)
    if not ok:
        return error_response(ErrorCode.INVALID_CAPTCHA, "验证失败")
    return success_response({"valid": True})


# ========== 图形验证码（普通注册使用） ==========
@router.get("/captcha")
async def get_captcha():
    data = await generate_captcha()
    return success_response(data)


# ========== 忘记密码 ==========
@router.post("/forgot-password/verify")
async def forgot_verify(req: ForgotVerifyRequest, db: Session = Depends(get_db)):
    if '@' in req.contact:
        if not await verify_email_code(req.contact, req.code):
            return error_response(ErrorCode.INVALID_CAPTCHA, "验证码错误")
        user = db.query(User).filter(User.email == req.contact, User.email_verified == True).first()
    else:
        if not await verify_phone_code(req.contact, req.code):
            return error_response(ErrorCode.INVALID_CAPTCHA, "验证码错误")
        user = db.query(User).filter(User.phone == req.contact).first()

    if not user:
        return error_response(ErrorCode.NOT_FOUND, "该联系方式未绑定任何账户")

    token = generate_reset_token()
    await store_reset_token(token, user.id)
    return success_response({
        "token": token,
        "username": user.username,
        "email": user.email,
        "phone": user.phone
    })


@router.post("/forgot-password/reset")
async def forgot_reset(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    token = body.get("token")
    new_password = body.get("newPassword")

    if not token or not new_password:
        return error_response(ErrorCode.VALIDATION_ERROR, "缺少参数")

    user_id = await verify_reset_token(token)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "重置链接已过期或无效")

    is_valid, msg = validate_password_strength(new_password)
    if not is_valid:
        return error_response(ErrorCode.VALIDATION_ERROR, msg)

    if not change_password(db, user_id, new_password):
        return error_response(ErrorCode.INTERNAL_ERROR, "修改密码失败")

    await redis_client.delete(f"reset_pwd:{token}")
    return success_response(None, "密码重置成功")