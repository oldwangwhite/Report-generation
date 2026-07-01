import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import get_settings


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")[:1024]
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password_bytes, salt, 260000)
    return f"pbkdf2_sha256$260000${_b64encode(salt)}${_b64encode(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt, digest = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8")[:1024],
            _b64decode(salt),
            int(iterations),
        )
        return hmac.compare_digest(_b64encode(candidate), digest)
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {**data, "exp": int(expire.timestamp())}
    payload_part = _b64encode(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    signature = hmac.new(settings.auth_secret_key.encode("utf-8"), payload_part.encode("ascii"), hashlib.sha256)
    return f"rg.{payload_part}.{_b64encode(signature.digest())}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    settings = get_settings()
    try:
        prefix, payload_part, signature_part = token.split(".", 2)
        if prefix != "rg":
            return None
        expected = hmac.new(
            settings.auth_secret_key.encode("utf-8"),
            payload_part.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(_b64encode(expected), signature_part):
            return None
        payload = json.loads(_b64decode(payload_part).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(datetime.now(timezone.utc).timestamp()):
            return None
        return payload
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
