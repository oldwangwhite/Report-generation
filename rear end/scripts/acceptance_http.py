import json
import sys
from pathlib import Path

import httpx


BASE_URL = "http://127.0.0.1:8000"
USER_HEADERS = {"Authorization": "Bearer user-token"}
ADMIN_HEADERS = {"Authorization": "Bearer admin-token"}
SUPER_HEADERS = {"Authorization": "Bearer super-token"}


def require_ok(response: httpx.Response, label: str) -> dict:
    response.raise_for_status()
    body = response.json()
    if body.get("code") != 200:
        raise AssertionError(f"{label} failed: {body}")
    print(f"PASS {label}")
    return body


def main() -> int:
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        health = require_ok(client.get("/api/health"), "health")
        assert health["data"]["status"] == "ok"

        unauthorized = client.get("/api/reports").json()
        assert unauthorized["code"] == 401
        print("PASS unauthorized reports")

        report = require_ok(
            client.post(
                "/api/reports",
                headers=USER_HEADERS,
                json={
                    "reportName": "XX电厂迎峰度夏检查报告",
                    "reportType": "summerCheck",
                    "topic": "迎峰度夏安全检查",
                    "major": "电气",
                    "plant": "XX电厂",
                    "year": 2026,
                },
            ),
            "create report",
        )["data"]
        report_id = report["reportId"]

        require_ok(
            client.get(
                "/api/reports",
                headers=USER_HEADERS,
                params={"page": 1, "size": 10, "keyword": "迎峰度夏", "reportType": "summerCheck"},
            ),
            "list reports",
        )
        require_ok(client.get(f"/api/reports/{report_id}", headers=USER_HEADERS), "report detail")

        outline = require_ok(
            client.post(
                f"/api/reports/{report_id}/outline/generate",
                headers=USER_HEADERS,
                json={"reportType": "summerCheck", "topic": "迎峰度夏安全检查"},
            ),
            "generate outline",
        )["data"]["outline"]
        chapter_id = outline[0]["chapterId"]

        saved_outline = require_ok(
            client.put(
                f"/api/reports/{report_id}/outline",
                headers=USER_HEADERS,
                json={
                    "outline": [
                        {
                            "chapterId": chapter_id,
                            "parentId": None,
                            "chapterNo": "1",
                            "title": "检查概况",
                            "level": 1,
                            "sortOrder": 1,
                        },
                        {
                            "chapterId": None,
                            "parentId": chapter_id,
                            "chapterNo": "1.1",
                            "title": "检查范围",
                            "level": 2,
                            "sortOrder": 1,
                        },
                    ]
                },
            ),
            "save outline",
        )["data"]["outline"]
        chapter_id = saved_outline[0]["chapterId"]

        stream = client.post(
            f"/api/reports/{report_id}/content/generate",
            headers={**USER_HEADERS, "Accept": "text/event-stream"},
            json={"chapterIds": [], "regenerate": False, "forceOverwrite": False},
        )
        assert stream.headers["content-type"].startswith("text/event-stream")
        assert "event: done" in stream.text
        for line in stream.text.splitlines():
            if line.startswith("data: "):
                json.loads(line.removeprefix("data: "))
        print("PASS content SSE")

        require_ok(
            client.put(
                f"/api/reports/{report_id}/chapters/{chapter_id}/content",
                headers=USER_HEADERS,
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
            ),
            "save content",
        )

        export = require_ok(
            client.post(
                f"/api/reports/{report_id}/exports",
                headers=USER_HEADERS,
                json={"templateId": "tpl_001", "fileFormat": "docx", "useLatestSavedContent": True},
            ),
            "create export",
        )["data"]
        export_id = export["exportId"]

        status = require_ok(
            client.get(f"/api/reports/{report_id}/exports/{export_id}", headers=USER_HEADERS),
            "export status",
        )["data"]
        assert status["status"] == "exported"
        require_ok(
            client.get(
                f"/api/reports/{report_id}/exports",
                headers=USER_HEADERS,
                params={"page": 1, "size": 10, "fileFormat": "docx"},
            ),
            "export history",
        )

        download = client.get(
            f"/api/reports/{report_id}/exports/{export_id}/download", headers=USER_HEADERS
        )
        download.raise_for_status()
        assert not download.headers["content-type"].startswith("application/json")
        output = Path("acceptance-download.docx")
        output.write_bytes(download.content)
        assert output.stat().st_size > 0
        print(f"PASS download file {output}")

        forbidden = client.get("/api/templates", headers=USER_HEADERS).json()
        assert forbidden["code"] == 403
        print("PASS user forbidden templates")

        require_ok(client.get("/api/templates", headers=ADMIN_HEADERS), "admin templates")
        require_ok(client.get("/api/materials", headers=ADMIN_HEADERS), "admin materials")
        cfg = require_ok(client.get("/api/admin/model-config", headers=ADMIN_HEADERS), "model config")
        assert "apiKey" not in cfg["data"]
        require_ok(client.get("/api/admin/users", headers=SUPER_HEADERS), "super users")

    print("ACCEPTANCE PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
