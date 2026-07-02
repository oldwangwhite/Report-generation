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

Configure verification delivery before using phone/email login:

```bash
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=your_email@163.com
SMTP_PASSWORD=your_smtp_auth_code
SMTP_FROM=your_email@163.com

SMS_HTTP_URL=https://your-sms-provider.example/send
SMS_HTTP_HEADERS_JSON={"Authorization":"Bearer your-token"}
SMS_HTTP_BODY_TEMPLATE={"phone":"$phone","content":"您的验证码是 $code，5 分钟内有效。"}
```

The backend no longer returns verification codes to the browser by default. For automated tests only, use `EXPOSE_DEV_VERIFICATION_CODES=true`.

Start the API:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Static Test Tokens

Static tokens are disabled by default outside `APP_ENV=test`. For local acceptance scripts only, set `ENABLE_STATIC_TEST_TOKENS=true`.

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
