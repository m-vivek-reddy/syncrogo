import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

# Read variables from .env
SECRET_KEY = os.getenv("SECRET_KEY") or "syncrogo-secret-key-production-change-in-env-32chars"
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 43200))

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    # Generate the encrypted JWT token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict | None:
    """Decode and validate a JWT access token."""
    if not SECRET_KEY:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def create_password_reset_token(email: str, password_hash: str) -> str:
    """Create a short-lived reset token invalidated by a password change."""
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY is not configured")
    password_version = hmac.new(SECRET_KEY.encode(), password_hash.encode(), hashlib.sha256).hexdigest()
    return jwt.encode(
        {"sub": email, "purpose": "password-reset", "password_version": password_version,
         "exp": datetime.now(timezone.utc) + timedelta(minutes=30)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def get_reset_token_email(token: str, password_hash: str) -> str | None:
    """Return the reset-token email only when the token is valid and current."""
    if not SECRET_KEY:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    expected_version = hmac.new(SECRET_KEY.encode(), password_hash.encode(), hashlib.sha256).hexdigest()
    if (payload.get("purpose") != "password-reset" or not isinstance(payload.get("sub"), str)
            or not hmac.compare_digest(payload.get("password_version", ""), expected_version)):
        return None
    return payload["sub"]
