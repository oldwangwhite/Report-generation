import smtplib
import asyncio
from email.mime.text import MIMEText
from src.config.settings import settings

async def send_email(to: str, subject: str, body: str):
    msg = MIMEText(body, 'html', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = settings.SMTP_FROM
    msg['To'] = to

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_sync, msg, to)

def _send_sync(msg, to):
    with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, [to], msg.as_string())