from io import BytesIO

from docx import Document

from tests.test_content_stream import prepared_report_with_outline


def prepare_generated_report(client, headers):
    report_id, outline = prepared_report_with_outline(client, headers)
    chapter_id = outline[0]["chapterId"]
    client.put(
        f"/api/reports/{report_id}/chapters/{chapter_id}/content",
        headers=headers,
        json={
            "content": "用户编辑后的章节正文。",
            "tables": [
                {
                    "tableId": "tbl_001",
                    "title": "设备检查情况表",
                    "headers": ["序号", "设备", "问题", "整改建议"],
                    "rows": [["1", "主变压器", "温度偏高", "加强巡检"]],
                }
            ],
            "manualEdited": True,
        },
    )
    return report_id


def docx_text(content: bytes) -> str:
    document = Document(BytesIO(content))
    paragraphs = [p.text for p in document.paragraphs]
    table_text = []
    for table in document.tables:
        for row in table.rows:
            table_text.extend(cell.text for cell in row.cells)
    return "\n".join(paragraphs + table_text)


def test_create_status_history_and_download_docx(client, auth_headers):
    report_id = prepare_generated_report(client, auth_headers)

    created = client.post(
        f"/api/reports/{report_id}/exports",
        headers=auth_headers,
        json={"templateId": "tpl_001", "fileFormat": "docx", "useLatestSavedContent": True},
    ).json()

    assert created["code"] == 200
    assert created["data"]["exportId"].startswith("exp_")
    assert created["data"]["status"] == "exporting"
    export_id = created["data"]["exportId"]

    status = client.get(
        f"/api/reports/{report_id}/exports/{export_id}", headers=auth_headers
    ).json()
    assert status["code"] == 200
    assert status["data"]["status"] == "exported"
    assert status["data"]["fileName"].endswith(".docx")
    assert status["data"]["downloadUrl"].endswith(f"/exports/{export_id}/download")

    history = client.get(
        f"/api/reports/{report_id}/exports",
        headers=auth_headers,
        params={"page": 1, "size": 10, "fileFormat": "docx"},
    ).json()
    assert history["code"] == 200
    assert history["data"]["total"] == 1
    assert history["data"]["items"][0]["exportId"] == export_id

    download = client.get(
        f"/api/reports/{report_id}/exports/{export_id}/download", headers=auth_headers
    )
    assert download.status_code == 200
    assert download.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    assert "filename*=UTF-8''" in download.headers["content-disposition"]
    text = docx_text(download.content)
    assert "用户编辑后的章节正文。" in text
    assert "设备检查情况表" in text


def test_pdf_export_returns_friendly_failure(client, auth_headers):
    report_id = prepare_generated_report(client, auth_headers)

    created = client.post(
        f"/api/reports/{report_id}/exports",
        headers=auth_headers,
        json={"fileFormat": "pdf", "useLatestSavedContent": True},
    ).json()

    assert created["code"] == 500
    assert created["message"] == "文件导出失败"
    assert created["data"]["errorType"] == "export_failed"
