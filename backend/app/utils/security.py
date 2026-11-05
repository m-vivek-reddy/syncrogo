import hashlib
import bcrypt

MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > MAX_PASSWORD_BYTES:
        raise ValueError(
            f"Password must be at most {MAX_PASSWORD_BYTES} UTF-8 bytes"
        )
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    if not hashed_password:
        return False
    pw_bytes = plain_password.encode("utf-8")
    if len(pw_bytes) > MAX_PASSWORD_BYTES:
        return False
    try:
        if hashed_password.startswith("bcrypt-sha256$"):
            pw_bytes = hashlib.sha256(pw_bytes).hexdigest().encode("ascii")
            return bcrypt.checkpw(pw_bytes, hashed_password.removeprefix("bcrypt-sha256$").encode("utf-8"))
        if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
            return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False
    return False
