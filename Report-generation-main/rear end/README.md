# Report Generation Backend

FastAPI backend for the report generation module described by `接口.md`.

## Runtime

Use Python 3.11 if available. The current local environment also runs the test suite on Python 3.10.

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

Configure MySQL in `.env` or environment variables:

```bash
DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3306/power_knowledge_management?charset=utf8mb4
UPLOAD_DIR=./uploads
EXPORT_DIR=./exports
```

The provided database already has users, roles, materials, configs, and logs. On startup the app creates the report module tables if absent and seeds local acceptance users/templates.

Start the API:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Local Tokens

- `Bearer user-token`
- `Bearer other-user-token`
- `Bearer admin-token`
- `Bearer super-token`

## Tests

```bash
python -m pytest -v
```

## Acceptance Flow

After starting the server:

```bash
python scripts/acceptance_http.py
```

The script follows the required Postman main flow:

创建报告 -> 查询报告 -> 生成大纲 -> 保存大纲 -> SSE 生成内容 -> 保存章节内容 -> 创建导出 -> 查询导出 -> 下载文件。
