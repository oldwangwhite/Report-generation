from tests.test_reports import create_report


def test_generate_outline_for_two_report_types(client, auth_headers):
    summer_report = create_report(client, auth_headers, report_type="summerCheck")["data"][
        "reportId"
    ]
    coal_report = create_report(
        client,
        auth_headers,
        report_type="coalInventoryAudit",
        name="XX电厂煤库存审计报告",
    )["data"]["reportId"]

    summer = client.post(
        f"/api/reports/{summer_report}/outline/generate",
        headers=auth_headers,
        json={
            "reportType": "summerCheck",
            "topic": "迎峰度夏安全检查",
            "templateId": "tpl_001",
        },
    ).json()
    coal = client.post(
        f"/api/reports/{coal_report}/outline/generate",
        headers=auth_headers,
        json={
            "reportType": "coalInventoryAudit",
            "topic": "煤库存审计",
            "templateId": "tpl_001",
        },
    ).json()

    assert summer["code"] == 200
    assert coal["code"] == 200
    assert len(summer["data"]["outline"]) >= 4
    assert len(coal["data"]["outline"]) >= 4
    assert summer["data"]["outline"][0]["title"] == "检查概况"
    assert coal["data"]["outline"][0]["title"] == "审计概况"
    assert summer["data"]["outline"][0]["chapterNo"] == "1"


def test_save_outline_adds_child_and_renumbers(client, auth_headers):
    report_id = create_report(client, auth_headers)["data"]["reportId"]
    generated = client.post(
        f"/api/reports/{report_id}/outline/generate",
        headers=auth_headers,
        json={"reportType": "summerCheck", "topic": "迎峰度夏安全检查"},
    ).json()["data"]["outline"]
    root = generated[0]

    saved = client.put(
        f"/api/reports/{report_id}/outline",
        headers=auth_headers,
        json={
            "outline": [
                {
                    "chapterId": root["chapterId"],
                    "parentId": None,
                    "chapterNo": "99",
                    "title": "检查概况调整",
                    "level": 1,
                    "sortOrder": 5,
                },
                {
                    "chapterId": None,
                    "parentId": root["chapterId"],
                    "chapterNo": "99.1",
                    "title": "新增检查范围",
                    "level": 2,
                    "sortOrder": 1,
                },
            ]
        },
    ).json()

    assert saved["code"] == 200
    outline = saved["data"]["outline"]
    assert len(outline) == 2
    assert outline[0]["chapterNo"] == "1"
    assert outline[0]["title"] == "检查概况调整"
    assert outline[1]["chapterId"].startswith("chap_")
    assert outline[1]["parentId"] == outline[0]["chapterId"]
    assert outline[1]["chapterNo"] == "1.1"
    assert outline[1]["level"] == 2

    detail = client.get(f"/api/reports/{report_id}", headers=auth_headers).json()
    assert len(detail["data"]["outline"]) == 2
    assert detail["data"]["outline"][1]["title"] == "新增检查范围"


def test_save_outline_omits_old_chapters_as_soft_deleted(client, auth_headers):
    report_id = create_report(client, auth_headers)["data"]["reportId"]
    generated = client.post(
        f"/api/reports/{report_id}/outline/generate",
        headers=auth_headers,
        json={"reportType": "summerCheck", "topic": "迎峰度夏安全检查"},
    ).json()["data"]["outline"]

    saved = client.put(
        f"/api/reports/{report_id}/outline",
        headers=auth_headers,
        json={"outline": [generated[0]]},
    ).json()

    assert saved["code"] == 200
    assert len(saved["data"]["outline"]) == 1
    detail = client.get(f"/api/reports/{report_id}", headers=auth_headers).json()
    assert len(detail["data"]["outline"]) == 1
