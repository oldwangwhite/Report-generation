def create_report(client, headers, report_type="summerCheck", name="XX电厂迎峰度夏检查报告"):
    response = client.post(
        "/api/reports",
        headers=headers,
        json={
            "reportName": name,
            "reportType": report_type,
            "topic": "迎峰度夏安全检查",
            "major": "电气",
            "plant": "XX电厂",
            "year": 2026,
        },
    )
    assert response.status_code == 200
    return response.json()


def test_create_report_supports_summer_check(client, auth_headers):
    body = create_report(client, auth_headers)

    assert body["code"] == 200
    assert body["data"]["reportId"].startswith("rpt_")
    assert body["data"]["reportName"] == "XX电厂迎峰度夏检查报告"
    assert body["data"]["reportType"] == "summerCheck"
    assert body["data"]["status"] == "draft"


def test_create_report_supports_coal_inventory_audit(client, auth_headers):
    body = create_report(
        client,
        auth_headers,
        report_type="coalInventoryAudit",
        name="XX电厂煤库存审计报告",
    )

    assert body["code"] == 200
    assert body["data"]["reportType"] == "coalInventoryAudit"


def test_create_report_rejects_invalid_type(client, auth_headers):
    response = client.post(
        "/api/reports",
        headers=auth_headers,
        json={
            "reportName": "错误报告",
            "reportType": "wrongType",
            "topic": "错误",
            "major": "电气",
            "plant": "XX电厂",
            "year": 2026,
        },
    )

    body = response.json()
    assert body["code"] == 400
    assert body["message"] == "参数错误"
    assert body["data"]["field"] == "reportType"


def test_list_detail_update_and_soft_delete_report(client, auth_headers):
    created = create_report(client, auth_headers)["data"]
    report_id = created["reportId"]

    list_response = client.get(
        "/api/reports",
        headers=auth_headers,
        params={"page": 1, "size": 10, "keyword": "迎峰度夏", "reportType": "summerCheck"},
    ).json()
    assert list_response["code"] == 200
    assert list_response["data"]["total"] == 1
    assert list_response["data"]["items"][0]["reportId"] == report_id
    assert list_response["data"]["page"] == 1
    assert list_response["data"]["size"] == 10

    detail = client.get(f"/api/reports/{report_id}", headers=auth_headers).json()
    assert detail["code"] == 200
    assert detail["data"]["report"]["reportId"] == report_id
    assert detail["data"]["outline"] == []
    assert detail["data"]["contents"] == []
    assert detail["data"]["latestExport"] is None

    updated = client.put(
        f"/api/reports/{report_id}",
        headers=auth_headers,
        json={
            "reportName": "XX电厂迎峰度夏检查报告-更新",
            "topic": "迎峰度夏安全检查补充说明",
            "major": "热控",
            "plant": "YY电厂",
            "year": 2027,
        },
    ).json()
    assert updated["code"] == 200
    assert updated["data"]["reportName"] == "XX电厂迎峰度夏检查报告-更新"
    assert updated["data"]["major"] == "热控"

    deleted = client.delete(f"/api/reports/{report_id}", headers=auth_headers).json()
    assert deleted["code"] == 200
    assert deleted["data"] is None

    missing = client.get(f"/api/reports/{report_id}", headers=auth_headers).json()
    assert missing["code"] == 404


def test_user_cannot_access_other_users_report(client, auth_headers):
    report_id = create_report(client, auth_headers)["data"]["reportId"]

    other_headers = {"Authorization": "Bearer other-user-token"}
    detail = client.get(f"/api/reports/{report_id}", headers=other_headers).json()

    assert detail["code"] == 404


def test_create_report_rejects_invalid_year(client, auth_headers):
    response = client.post(
        "/api/reports",
        headers=auth_headers,
        json={
            "reportName": "invalid year",
            "reportType": "summerCheck",
            "topic": "topic",
            "major": "电气",
            "plant": "XX电厂",
            "year": 1800,
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body["code"] == 400
    assert body["data"]["field"] == "year"


def test_create_report_rejects_missing_template_and_material(client, auth_headers):
    response = client.post(
        "/api/reports",
        headers=auth_headers,
        json={
            "reportName": "bad refs",
            "reportType": "summerCheck",
            "topic": "topic",
            "major": "电气",
            "plant": "XX电厂",
            "year": 2026,
            "templateId": "tpl_999999",
            "materialIds": ["mat_999999"],
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body["code"] == 400
    assert body["data"]["field"] == "templateId"
