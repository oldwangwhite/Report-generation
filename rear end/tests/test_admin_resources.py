from pathlib import Path


def test_normal_user_cannot_access_admin_resources(client, auth_headers):
    urls = [
        "/api/templates",
        "/api/materials",
        "/api/admin/model-config",
        "/api/admin/users",
    ]
    for url in urls:
        response = client.get(url, headers=auth_headers).json()
        assert response["code"] == 403


def test_admin_template_lifecycle(client, admin_headers, tmp_path):
    template_file = tmp_path / "template.docx"
    template_file.write_bytes(b"template")

    uploaded = client.post(
        "/api/templates",
        headers=admin_headers,
        data={"templateName": "迎峰度夏默认模板", "reportType": "summerCheck"},
        files={"file": ("template.docx", template_file.read_bytes(), "application/octet-stream")},
    ).json()
    assert uploaded["code"] == 200
    template_id = uploaded["data"]["templateId"]
    assert uploaded["data"]["status"] == "enabled"

    listed = client.get(
        "/api/templates", headers=admin_headers, params={"page": 1, "size": 10}
    ).json()
    assert listed["code"] == 200
    assert listed["data"]["total"] >= 1

    detail = client.get(f"/api/templates/{template_id}", headers=admin_headers).json()
    assert detail["code"] == 200
    assert detail["data"]["templateId"] == template_id

    updated = client.put(
        f"/api/templates/{template_id}",
        headers=admin_headers,
        json={
            "templateName": "迎峰度夏模板更新",
            "status": "enabled",
            "structure": {"titleStyle": "Heading1"},
        },
    ).json()
    assert updated["data"]["templateName"] == "迎峰度夏模板更新"

    disabled = client.patch(
        f"/api/templates/{template_id}/status",
        headers=admin_headers,
        json={"status": "disabled"},
    ).json()
    assert disabled["data"]["status"] == "disabled"

    deleted = client.delete(f"/api/templates/{template_id}", headers=admin_headers).json()
    assert deleted["code"] == 200
    assert deleted["data"] is None


def test_admin_material_lifecycle(client, admin_headers, tmp_path):
    material_file = tmp_path / "standard.pdf"
    material_file.write_bytes(b"material")

    uploaded = client.post(
        "/api/materials",
        headers=admin_headers,
        data={
            "materialName": "迎峰度夏检查标准",
            "materialType": "inspection_report",
            "major": "电气",
            "description": "检查标准素材",
        },
        files={"file": ("standard.pdf", material_file.read_bytes(), "application/pdf")},
    ).json()
    assert uploaded["code"] == 200
    material_id = uploaded["data"]["materialId"]
    assert uploaded["data"]["status"] == "enabled"

    listed = client.get(
        "/api/materials",
        headers=admin_headers,
        params={"page": 1, "size": 10, "major": "电气", "keyword": "检查标准"},
    ).json()
    assert listed["code"] == 200
    assert listed["data"]["total"] == 1

    detail = client.get(f"/api/materials/{material_id}", headers=admin_headers).json()
    assert detail["code"] == 200
    assert detail["data"]["major"] == "电气"

    disabled = client.patch(
        f"/api/materials/{material_id}/status",
        headers=admin_headers,
        json={"status": "disabled"},
    ).json()
    assert disabled["data"]["status"] == "disabled"

    deleted = client.delete(f"/api/materials/{material_id}", headers=admin_headers).json()
    assert deleted["code"] == 200


def test_model_config_masks_api_key_and_tests_connection(client, admin_headers):
    saved = client.put(
        "/api/admin/model-config",
        headers=admin_headers,
        json={
            "apiUrl": "https://api.example.com/v1/chat/completions",
            "modelName": "report-model",
            "apiKey": "sk-xxxxxxxxabcd",
            "timeoutSeconds": 120,
            "enabled": True,
        },
    ).json()
    assert saved["code"] == 200
    assert "apiKey" not in saved["data"]
    assert saved["data"]["apiKeyMasked"] == "sk-****abcd"

    queried = client.get("/api/admin/model-config", headers=admin_headers).json()
    assert queried["data"]["apiKeyMasked"] == "sk-****abcd"
    assert "apiKey" not in queried["data"]

    tested = client.post("/api/admin/model-config/test", headers=admin_headers).json()
    assert tested["code"] == 200
    assert tested["data"]["available"] is True
    assert tested["data"]["latencyMs"] >= 0


def test_only_super_admin_can_manage_users(client, admin_headers, super_headers):
    admin_denied = client.get("/api/admin/users", headers=admin_headers).json()
    assert admin_denied["code"] == 403

    listed = client.get(
        "/api/admin/users",
        headers=super_headers,
        params={"page": 1, "size": 10, "role": "user", "status": "enabled"},
    ).json()
    assert listed["code"] == 200
    assert listed["data"]["total"] >= 1
    user_id = listed["data"]["items"][0]["userId"]

    role_changed = client.patch(
        f"/api/admin/users/{user_id}/role",
        headers=super_headers,
        json={"role": "admin"},
    ).json()
    assert role_changed["code"] == 200
    assert role_changed["data"]["role"] == "admin"

    disabled = client.patch(
        f"/api/admin/users/{user_id}/status",
        headers=super_headers,
        json={"status": "disabled"},
    ).json()
    assert disabled["code"] == 200
    assert disabled["data"]["status"] == "disabled"
