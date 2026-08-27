import bcrypt


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    if not hashed_password:
        return False
    pw_bytes = plain_password.encode("utf-8")[:72]
    try:
        if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
            return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except Exception:
        pass
    return plain_password == hashed_password
