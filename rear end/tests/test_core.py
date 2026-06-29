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


def test_openapi_available(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "report-generation-backend"
