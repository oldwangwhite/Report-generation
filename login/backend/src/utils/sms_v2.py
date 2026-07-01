import json
import asyncio
from alibabacloud_dypnsapi20170525.client import Client
from alibabacloud_dypnsapi20170525 import models as dypns_models
from alibabacloud_tea_openapi import models as open_api_models
from src.config.settings import settings

def _send_verify_code_sync(phone: str, code: str):
    config = open_api_models.Config(
        access_key_id=settings.ALIBABA_CLOUD_ACCESS_KEY_ID,
        access_key_secret=settings.ALIBABA_CLOUD_ACCESS_KEY_SECRET
    )
    config.endpoint = 'dypnsapi.aliyuncs.com'
    client = Client(config)

    req = dypns_models.SendSmsVerifyCodeRequest(
        phone_number=phone,
        sign_name="速通互联验证码",          # 必须与赠送签名一致
        template_code="100001",              # 必须与控制台模板CODE一致
        template_param=json.dumps({
            "code": code,                   # 验证码变量
            "min": "5"                      # 有效期变量，注意是 min 不是 expire
        }),
        code_type=0,
        sms_up_extend_code="",
        out_id=""
    )
    resp = client.send_sms_verify_code(req)
    return resp.body

def _check_verify_code_sync(phone: str, code: str):
    """同步核验验证码"""
    config = open_api_models.Config(
        access_key_id=settings.ALIBABA_CLOUD_ACCESS_KEY_ID,
        access_key_secret=settings.ALIBABA_CLOUD_ACCESS_KEY_SECRET
    )
    config.endpoint = 'dypnsapi.aliyuncs.com'
    client = Client(config)

    req = dypns_models.CheckSmsVerifyCodeRequest(
        phone_number=phone,
        verify_code=code
    )
    resp = client.check_sms_verify_code(req)
    return resp.body

async def send_sms_v2(phone: str, code: str):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _send_verify_code_sync, phone, code)

async def check_sms_v2(phone: str, code: str):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _check_verify_code_sync, phone, code)