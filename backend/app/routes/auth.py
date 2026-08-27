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

    # Find the user by email (case-insensitive and trimmed)
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()

    # Verify user exists and password matches
    if not user or not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

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
