def test_normal_user_cannot_access_admin_resources(client, auth_headers):
    urls = [
        "/api/admin/model-config",
        "/api/admin/users",
    ]
    for url in urls:
        response = client.get(url, headers=auth_headers).json()
        assert response["code"] == 403


def test_normal_user_uses_options_but_cannot_read_admin_resource_lists(client, auth_headers):
    denied_templates = client.get("/api/templates", headers=auth_headers)
    assert denied_templates.status_code == 403
    assert denied_templates.json()["code"] == 403

    denied_materials = client.get("/api/materials", headers=auth_headers)
    assert denied_materials.status_code == 403
    assert denied_materials.json()["code"] == 403

    templates = client.get("/api/templates/options", headers=auth_headers).json()
    assert templates["code"] == 200
    assert templates["data"]["total"] >= 1

    materials = client.get("/api/materials/options", headers=auth_headers).json()
    assert materials["code"] == 200


def test_normal_user_cannot_write_templates_or_materials(client, auth_headers, tmp_path):
    template_file = tmp_path / "template.docx"
    template_file.write_bytes(b"template")
    template_created = client.post(
        "/api/templates",
        headers=auth_headers,
        data={"templateName": "template", "reportType": "summerCheck"},
        files={"file": ("template.docx", template_file.read_bytes(), "application/octet-stream")},
    ).json()
    assert template_created["code"] == 403

    material_file = tmp_path / "standard.pdf"
    material_file.write_bytes(b"material")
    material_created = client.post(
        "/api/materials",
        headers=auth_headers,
        data={"materialName": "standard", "materialType": "inspection_report"},
        files={"file": ("standard.pdf", material_file.read_bytes(), "application/pdf")},
    ).json()
    assert material_created["code"] == 403


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


def test_admin_material_upload_rejects_dangerous_file_type(client, admin_headers, tmp_path):
    executable = tmp_path / "tool.exe"
    executable.write_bytes(b"MZ")

    response = client.post(
        "/api/materials",
        headers=admin_headers,
        data={"materialName": "危险文件", "materialType": "binary"},
        files={"file": ("tool.exe", executable.read_bytes(), "application/x-msdownload")},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["code"] == 400
    assert body["data"]["field"] == "file"


def test_model_config_masks_api_key_and_tests_connection(client, admin_headers, monkeypatch):
    def fake_test_model_connection(db):
        return {"modelName": "report-model", "reply": "pong"}

    monkeypatch.setattr("app.service.model_config_service.test_model_connection", fake_test_model_connection)
    saved = client.put(
        "/api/admin/model-config",
        headers=admin_headers,
        json={
            "apiUrl": "https://llm.local/v1/chat/completions",
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
    assert tested["data"]["modelName"] == "report-model"
    assert tested["data"]["reply"] == "pong"
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


def test_super_admin_can_update_role_permissions(client, auth_headers, super_headers):
    listed = client.get("/api/admin/roles/permissions", headers=super_headers).json()
    assert listed["code"] == 200
    assert {item["code"] for item in listed["data"]["availablePermissions"]} >= {
        "report.generate",
        "report.export",
        "admin.resources",
        "user.manage",
    }

    updated = client.put(
        "/api/admin/roles/user/permissions",
        headers=super_headers,
        json={"permissionCodes": ["report.export"]},
    ).json()
    assert updated["code"] == 200
    user_role = next(item for item in updated["data"]["roles"] if item["role"] == "user")
    assert user_role["permissionCodes"] == ["report.export"]

    denied = client.post(
        "/api/reports",
        headers=auth_headers,
        json={
            "reportName": "权限测试报告",
            "reportType": "summerCheck",
            "topic": "权限测试",
            "major": "电气",
            "plant": "XX电厂",
            "year": 2026,
        },
    ).json()
    assert denied["code"] == 403
