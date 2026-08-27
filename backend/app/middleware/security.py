import time
from collections import defaultdict
from typing import Dict, List, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

# Store request timestamps per IP: ip -> list of timestamps
_RATE_LIMIT_STORE: Dict[str, List[float]] = defaultdict(list)
_AUTH_RATE_LIMIT_STORE: Dict[str, List[float]] = defaultdict(list)

# Limits
GLOBAL_WINDOW_SECONDS = 60
GLOBAL_MAX_REQUESTS = 180  # 180 req/min general

AUTH_WINDOW_SECONDS = 60
AUTH_MAX_REQUESTS = 25  # 25 req/min for auth endpoints

AUTH_PATHS = (
    "/login",
    "/api/v1/users/login",
    "/api/v1/users/register",
    "/api/v1/users/verify-otp",
    "/api/v1/users/verify-login-otp",
    "/api/v1/users/resend-otp",
    "/api/v1/users/forgot-password",
    "/api/v1/users/reset-password",
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds essential production security headers to all HTTP responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # 1. Prevent MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 2. Prevent Clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # 3. Cross-Site Scripting protection
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # 4. Strict Transport Security (HSTS)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # 5. Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 6. Permissions Policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(self), camera=(), microphone=(), payment=(self 'https://checkout.razorpay.com')"
        )

        return response


class RateLimitAndBotProtectionMiddleware(BaseHTTPMiddleware):
    """Protects login, registration, and OTP endpoints from brute-force & credential stuffing."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Get client IP (support X-Forwarded-For if behind reverse proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "127.0.0.1"

        now = time.time()
        path = request.url.path.rstrip("/")

        # Check Auth Rate Limit
        if any(path.startswith(auth_path.rstrip("/")) for auth_path in AUTH_PATHS):
            timestamps = _AUTH_RATE_LIMIT_STORE[client_ip]
            # Prune old timestamps
            _AUTH_RATE_LIMIT_STORE[client_ip] = [
                t for t in timestamps if now - t < AUTH_WINDOW_SECONDS
            ]
            if len(_AUTH_RATE_LIMIT_STORE[client_ip]) >= AUTH_MAX_REQUESTS:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please slow down and try again in a minute."
                    },
                    headers={"Retry-After": "60"},
                )
            _AUTH_RATE_LIMIT_STORE[client_ip].append(now)

        # Global Rate Limit
        global_timestamps = _RATE_LIMIT_STORE[client_ip]
        _RATE_LIMIT_STORE[client_ip] = [
            t for t in global_timestamps if now - t < GLOBAL_WINDOW_SECONDS
        ]
        if len(_RATE_LIMIT_STORE[client_ip]) >= GLOBAL_MAX_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please wait before making more requests."
                },
                headers={"Retry-After": "60"},
            )
        _RATE_LIMIT_STORE[client_ip].append(now)

        return await call_next(request)
