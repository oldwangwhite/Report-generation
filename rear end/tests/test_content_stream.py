import json

from tests.test_reports import create_report


def prepared_report_with_outline(client, headers):
    report_id = create_report(client, headers)["data"]["reportId"]
    outline = client.post(
        f"/api/reports/{report_id}/outline/generate",
        headers=headers,
        json={"reportType": "summerCheck", "topic": "迎峰度夏安全检查"},
    ).json()["data"]["outline"]
    return report_id, outline


def parse_sse(text: str) -> list[tuple[str, dict]]:
    events: list[tuple[str, dict]] = []
    current_event: str | None = None
    for line in text.splitlines():
        if line.startswith("event: "):
            current_event = line.removeprefix("event: ").strip()
        elif line.startswith("data: "):
            assert current_event is not None
            events.append((current_event, json.loads(line.removeprefix("data: "))))
            current_event = None
    return events


def test_content_generate_returns_parseable_sse_and_persists(client, auth_headers):
    report_id, outline = prepared_report_with_outline(client, auth_headers)

    response = client.post(
        f"/api/reports/{report_id}/content/generate",
        headers={**auth_headers, "Accept": "text/event-stream"},
        json={"chapterIds": [], "regenerate": False, "forceOverwrite": False},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(response.text)
    names = [name for name, _ in events]
    assert "chapterStart" in names
    assert "chunk" in names
    assert "table" in names
    assert "progress" in names
    assert "chapterDone" in names
    assert names[-1] == "done"
    assert events[-1][1]["status"] == "generated"

    detail = client.get(f"/api/reports/{report_id}", headers=auth_headers).json()
    assert len(detail["data"]["contents"]) == len(outline)
    assert detail["data"]["contents"][0]["tables"]


def test_save_chapter_content_marks_manual_edited(client, auth_headers):
    report_id, outline = prepared_report_with_outline(client, auth_headers)
    chapter_id = outline[0]["chapterId"]

    saved = client.put(
        f"/api/reports/{report_id}/chapters/{chapter_id}/content",
        headers=auth_headers,
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
    ).json()

    assert saved["code"] == 200
    assert saved["data"]["chapterId"] == chapter_id
    assert saved["data"]["status"] == "done"
    assert saved["data"]["updatedAt"]

    detail = client.get(f"/api/reports/{report_id}", headers=auth_headers).json()
    content = detail["data"]["contents"][0]
    assert content["content"] == "用户编辑后的章节正文。"
    assert content["manualEdited"] is True


def test_generate_does_not_overwrite_manual_edit_without_force(client, auth_headers):
    report_id, outline = prepared_report_with_outline(client, auth_headers)
    chapter_id = outline[0]["chapterId"]
    client.put(
        f"/api/reports/{report_id}/chapters/{chapter_id}/content",
        headers=auth_headers,
        json={"content": "手动内容", "tables": [], "manualEdited": True},
    )

    response = client.post(
        f"/api/reports/{report_id}/content/generate",
        headers={**auth_headers, "Accept": "text/event-stream"},
        json={"chapterIds": [chapter_id], "regenerate": True, "forceOverwrite": False},
    )
    events = parse_sse(response.text)
    assert ("chapterDone", {"reportId": report_id, "chapterId": chapter_id, "status": "done"}) in events

    detail = client.get(f"/api/reports/{report_id}", headers=auth_headers).json()
    assert detail["data"]["contents"][0]["content"] == "手动内容"


def test_regenerate_force_overwrite_replaces_manual_edit(client, auth_headers):
    report_id, outline = prepared_report_with_outline(client, auth_headers)
    chapter_id = outline[0]["chapterId"]
    client.put(
        f"/api/reports/{report_id}/chapters/{chapter_id}/content",
        headers=auth_headers,
        json={"content": "手动内容", "tables": [], "manualEdited": True},
    )

    response = client.post(
        f"/api/reports/{report_id}/chapters/{chapter_id}/regenerate",
        headers={**auth_headers, "Accept": "text/event-stream"},
        json={"forceOverwrite": True, "extraPrompt": "补充整改闭环"},
    )
    events = parse_sse(response.text)
    assert events[-1][0] == "done"

    detail = client.get(f"/api/reports/{report_id}", headers=auth_headers).json()
    assert detail["data"]["contents"][0]["content"] != "手动内容"
    assert "检查概况" in detail["data"]["contents"][0]["content"]
