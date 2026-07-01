# backend/app/auth/password_validator.py
import re
import secrets
import string


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    密码强度规则：长度8-30，至少包含大写字母、小写字母、数字、特殊符号中的三种
    """
    if len(password) < 8:
        return False, "密码长度至少8位"
    if len(password) > 30:
        return False, "密码长度不能超过30位"

    categories = 0
    if re.search(r'[A-Z]', password): categories += 1
    if re.search(r'[a-z]', password): categories += 1
    if re.search(r'[0-9]', password): categories += 1
    if re.search(r'[^A-Za-z0-9]', password): categories += 1

    if categories < 3:
        return False, "密码需包含大写字母、小写字母、数字、特殊符号中的至少三种"
    return True, ""


def generate_strong_password(length=12) -> str:
    """生成一个强随机密码"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        # 保证至少满足强度规则
        if (any(c.islower() for c in password) and
                any(c.isupper() for c in password) and
                any(c.isdigit() for c in password) and
                any(c in "!@#$%^&*()" for c in password)):
            return password