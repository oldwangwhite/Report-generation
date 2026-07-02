def test_health_returns_trace_id(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 200
    assert body["message"] == "ok"
    assert body["data"]["status"] == "ok"
    assert body["traceId"].startswith("trace_")


def test_missing_authorization_returns_business_401(client):
    response = client.get("/api/reports")

    assert response.status_code == 401
    body = response.json()
    assert body["code"] == 401
    assert body["message"] == "未认证或凭证过期"
    assert body["traceId"].startswith("trace_")


def test_invalid_authorization_returns_business_401(client):
    response = client.get("/api/reports", headers={"Authorization": "Bearer bad"})

    assert response.status_code == 401
    body = response.json()
    assert body["code"] == 401
    assert body["message"] == "未认证或凭证过期"


def test_registered_user_token_can_access_reports(client):
    captcha = client.get("/api/auth/captcha").json()["data"]
    registered = client.post(
        "/api/auth/register",
        json={
            "username": "registered_user",
            "password": "Password123!",
            "email": "registered@example.com",
            "captchaId": captcha["captchaId"],
            "captchaCode": captcha["devCode"],
            "displayName": "Registered User",
        },
    ).json()

    assert registered["code"] == 200
    token = registered["data"]["accessToken"]

    current = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert current["code"] == 200
    assert current["data"]["username"] == "registered_user"

    reports = client.get("/api/reports", headers={"Authorization": f"Bearer {token}"}).json()
    assert reports["code"] == 200
    assert reports["data"]["total"] == 0


def test_register_requires_contact_and_captcha(client):
    missing_contact = client.post(
        "/api/auth/register",
        json={"username": "no_contact", "password": "Password123!"},
    )
    assert missing_contact.status_code == 400
    assert missing_contact.json()["message"] == "请至少填写手机号或邮箱"

    missing_captcha = client.post(
        "/api/auth/register",
        json={"username": "no_captcha", "password": "Password123!", "email": "no-captcha@example.com"},
    )
    assert missing_captcha.status_code == 400
    assert missing_captcha.json()["message"] == "验证码错误"


def test_password_login_requires_verified_slide_captcha(client):
    response = client.post(
        "/api/auth/login",
        json={"username": "student", "password": "Password123!"},
    )
    assert response.status_code == 400
    assert response.json()["message"] == "请先完成滑块验证"


def test_email_code_is_sent_and_not_exposed_when_disabled(client, monkeypatch):
    sent = []
    monkeypatch.setenv("EXPOSE_DEV_VERIFICATION_CODES", "false")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_USER", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "secret")
    monkeypatch.setenv("SMTP_FROM", "sender@example.com")
    from app.core.config import get_settings

    get_settings.cache_clear()

    def fake_send_email(self, email, code):
        sent.append((email, code))

    monkeypatch.setattr("app.service.verification_code_service.VerificationCodeService._send_email", fake_send_email)
    response = client.post("/api/auth/email/send-code", json={"email": "real@example.com"})

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 200
    assert "devCode" not in body["data"]
    assert sent[0][0] == "real@example.com"
    assert len(sent[0][1]) == 6
    get_settings.cache_clear()


def test_phone_code_requires_sms_provider_config(client, monkeypatch):
    monkeypatch.setenv("SMS_HTTP_URL", "")
    from app.core.config import get_settings

    get_settings.cache_clear()
    response = client.post("/api/auth/phone/send-code", json={"phone": "15100491426"})

    assert response.status_code == 500
    assert response.json()["message"] == "短信验证码服务未配置"
    get_settings.cache_clear()


def test_openapi_available(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "report-generation-backend"
