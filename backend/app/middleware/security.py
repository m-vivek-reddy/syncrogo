import os
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
AUTH_MAX_REQUESTS = 25  # Other auth endpoints, per minute
LOGIN_MAX_REQUESTS = 5  # Login attempts, per minute

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
        client_ip = self._client_ip(request)

        now = time.time()
        path = request.url.path.rstrip("/")

        _prune_rate_limit_stores(now)

        # Check Auth Rate Limit
        if request.method == "POST" and path in AUTH_PATHS:
            key = f"auth:{client_ip}"
            timestamps = _AUTH_RATE_LIMIT_STORE[key]
            _AUTH_RATE_LIMIT_STORE[key] = [
                t for t in timestamps if now - t < AUTH_WINDOW_SECONDS
            ]
            limit = (
                LOGIN_MAX_REQUESTS
                if path in ("/login", "/api/v1/users/login")
                else AUTH_MAX_REQUESTS
            )
            if len(_AUTH_RATE_LIMIT_STORE[key]) >= limit:
                _AUTH_OFFENSE_TRACKER[key] = _AUTH_OFFENSE_TRACKER.get(key, 0) + 1
                offenses = _AUTH_OFFENSE_TRACKER[key]
                penalty = min(15 * 60, 60 * (2 ** (offenses - 1)))  # 60s, 120s, 240s ... cap 15min
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please slow down and try again in a minute."
                    },
                    headers={"Retry-After": str(penalty)},
                )
            _AUTH_RATE_LIMIT_STORE[key].append(now)

        # Global Rate Limit
        gkey = f"global:{client_ip}"
        global_timestamps = _RATE_LIMIT_STORE[gkey]
        _RATE_LIMIT_STORE[gkey] = [
            t for t in global_timestamps if now - t < GLOBAL_WINDOW_SECONDS
        ]
        if len(_RATE_LIMIT_STORE[gkey]) >= GLOBAL_MAX_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please wait before making more requests."
                },
                headers={"Retry-After": "60"},
            )
        _RATE_LIMIT_STORE[gkey].append(now)

        return await call_next(request)

    @staticmethod
    def _client_ip(request: Request) -> str:
        """Resolve the real client IP without trusting spoofable headers.

        SECURITY: X-Forwarded-For values are client-controlled except for
        the entries appended by proxies we operate. Trusting the first
        entry let anyone rotate fake IPs to bypass the 25/min auth limit.

        Trust chain:
        - If the direct peer is a TRUSTED_PROXY (loopback, or an entry in
          TRUSTED_PROXY_COUNT for clustered deployments), walk one hop back
          through X-Forwarded-For for each trusted layer.
        - Otherwise the peer IS the client; XFF is ignored entirely.
        """
        peer = request.client.host if request.client else "127.0.0.1"

        if peer not in TRUSTED_PROXIES:
            # Direct client — do NOT read X-Forwarded-For at all.
            return peer

        forwarded = request.headers.get("X-Forwarded-For")
        if not forwarded:
            return peer

        # Rightmost N entries are our trusted proxies; the one just before
        # them is the client. (Proxies append to the right.)
        hops = TRUSTED_PROXY_COUNT if TRUSTED_PROXY_COUNT > 0 else 1
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if len(parts) <= hops:
            # Not enough entries — likely spoofed or direct; fall back to peer.
            return peer
        return parts[-hops - 1]


# ----------------------------------------------------------------
# Trusted-proxy configuration (env-driven, safe defaults)
# ----------------------------------------------------------------
# Local dev: uvicorn talks straight to the browser -> peer is loopback and
# IS the client, so XFF must be ignored (loopback in the trust list only
# matters when a local reverse proxy fronts the API).
TRUSTED_PROXIES = frozenset({"127.0.0.1", "::1"})
# On Render/Heroku-like platforms set TRUSTED_PROXY_HOPS=1 in the dashboard.
TRUSTED_PROXY_COUNT = int(os.getenv("TRUSTED_PROXY_HOPS", "0"))

# ----------------------------------------------------------------
# Progressive-penalty tracker for auth brute force
# ----------------------------------------------------------------
_AUTH_OFFENSE_TRACKER: dict[str, int] = {}

# Periodic memory-bound cleanup so the stores cannot grow unboundedly
# under a distributed attack (thousands of spoofed source IPs).
_CLEANUP_INTERVAL = 300
_LAST_CLEANUP = time.time()


def _prune_rate_limit_stores(now: float) -> None:
    global _LAST_CLEANUP
    if now - _LAST_CLEANUP < _CLEANUP_INTERVAL:
        return
    _LAST_CLEANUP = now
    cutoff_g = now - GLOBAL_WINDOW_SECONDS
    cutoff_a = now - AUTH_WINDOW_SECONDS * 60  # keep some history for penalties
    for store, cutoff in ((_RATE_LIMIT_STORE, cutoff_g), (_AUTH_RATE_LIMIT_STORE, cutoff_a)):
        for key in list(store.keys()):
            if not store[key] or store[key][-1] < cutoff:
                del store[key]
