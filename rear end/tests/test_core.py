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

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 401
    assert body["message"] == "未认证或凭证过期"
    assert body["traceId"].startswith("trace_")


def test_invalid_authorization_returns_business_401(client):
    response = client.get("/api/reports", headers={"Authorization": "Bearer bad"})

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 401
    assert body["message"] == "未认证或凭证过期"


def test_registered_user_token_can_access_reports(client):
    registered = client.post(
        "/api/auth/register",
        json={
            "username": "registered_user",
            "password": "Password123!",
            "email": "registered@example.com",
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


def test_openapi_available(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "report-generation-backend"
