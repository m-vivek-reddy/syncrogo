import os
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import List, Optional

from app.db.session import get_db
from app.models.user import User
from app.utils.security import verify_password
from app.auth.jwt import create_access_token, SECRET_KEY, ALGORITHM

router = APIRouter(tags=["Authentication"])

# ----------------------------------------------------------------
# Per-account brute-force lockout (independent of client IP)
# ----------------------------------------------------------------
# The middleware rate-limits per IP; this locks per ACCOUNT so a distributed
# attacker rotating IPs cannot keep guessing one victim's password forever.

MAX_FAILED_LOGINS = 8
LOCKOUT_SECONDS = 15 * 60  # 15 minutes

_failed_logins: dict[str, list[float]] = {}
_locked_until: dict[str, float] = {}


def _account_lockout_state(email: str) -> tuple[int, float]:
    """Returns (remaining_attempts, seconds_remaining_on_lockout)."""
    import time as _time

    now = _time.time()
    key = email.strip().lower()

    until = _locked_until.get(key, 0)
    if until > now:
        return 0, until - now
    if until:
        # Lockout expired — reset the counter.
        _locked_until.pop(key, None)
        _failed_logins.pop(key, None)

    recent = [t for t in _failed_logins.get(key, []) if now - t < LOCKOUT_SECONDS]
    _failed_logins[key] = recent
    return max(0, MAX_FAILED_LOGINS - len(recent)), 0.0


def _record_failed_login(email: str) -> None:
    import time as _time

    now = _time.time()
    key = email.strip().lower()
    recent = [t for t in _failed_logins.get(key, []) if now - t < LOCKOUT_SECONDS]
    recent.append(now)
    _failed_logins[key] = recent
    if len(recent) >= MAX_FAILED_LOGINS:
        _locked_until[key] = now + LOCKOUT_SECONDS


def _clear_failed_logins(email: str) -> None:
    _failed_logins.pop(email.strip().lower(), None)
    _locked_until.pop(email.strip().lower(), None)

# Tell FastAPI where the token comes from (matches your login route)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

@router.post("/login")
@router.post("/api/v1/users/login")
async def login(
    request: Request,
    db: Session = Depends(get_db),
):
    email_clean = ""
    password = ""

    # 1. Try parsing JSON body first
    try:
        body = await request.json()
        if isinstance(body, dict):
            email_clean = (
                body.get("email") or body.get("username") or ""
            ).strip().lower()
            password = str(body.get("password") or "")
    except Exception:
        pass

    # 2. If not found in JSON, try parsing Form data
    if not email_clean or not password:
        try:
            form = await request.form()
            email_clean = (
                form.get("username") or form.get("email") or ""
            ).strip().lower()
            password = str(form.get("password") or "")
        except Exception:
            pass

    if not email_clean or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required.",
        )

    # Per-account lockout check (before touching the DB / bcrypt).
    remaining, locked_for = _account_lockout_state(email_clean)
    if locked_for > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Try again in {int(locked_for // 60) + 1} minute(s).",
            headers={"Retry-After": str(int(locked_for) + 1)},
        )

    # Find the user by email (case-insensitive and trimmed)
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()

    # Verify user exists and password matches
    if not user or not verify_password(password, user.password):
        _record_failed_login(email_clean)
        remaining_after, _ = _account_lockout_state(email_clean)
        if remaining_after == 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Account locked for {LOCKOUT_SECONDS // 60} minutes.",
                headers={"Retry-After": str(LOCKOUT_SECONDS)},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _clear_failed_logins(email_clean)

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required. Please verify the OTP before logging in.",
        )

    # Generate the JWT token with role
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "profile_photo_url": user.profile_photo_url,
        },
    }

# Dependency to get the current logged-in user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Fetch the user from the database
    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if user is None:
        raise credentials_exception

    return user


def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            return None
        return db.query(User).filter(func.lower(User.email) == email.lower()).first()
    except Exception:
        return None
