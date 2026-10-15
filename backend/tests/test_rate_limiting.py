"""Tests for password brute-force protection.

Covers the two layers:
1. Middleware IP rate limiting (25/min on auth paths + progressive penalty).
2. Per-account lockout in the login route (8 failures -> 15 min lock).

Also verifies the X-Forwarded-For spoofing fix: an untrusted peer cannot
rotate fake XFF values to bypass the limit.
"""

import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.security import (
    AUTH_MAX_REQUESTS,
    AUTH_WINDOW_SECONDS,
    RateLimitAndBotProtectionMiddleware,
    _AUTH_RATE_LIMIT_STORE,
    _AUTH_OFFENSE_TRACKER,
    TRUSTED_PROXIES,
)


def make_client() -> TestClient:
    app = FastAPI()
    app.add_middleware(RateLimitAndBotProtectionMiddleware)

    @app.post("/api/v1/users/login")
    def login():
        return {"ok": True}

    @app.get("/health")
    def health():
        return {"ok": True}

    return TestClient(app)


@pytest.fixture(autouse=True)
def clean_stores():
    _AUTH_RATE_LIMIT_STORE.clear()
    _AUTH_OFFENSE_TRACKER.clear()
    yield
    _AUTH_RATE_LIMIT_STORE.clear()
    _AUTH_OFFENSE_TRACKER.clear()


class TestAuthRateLimit:
    def test_allows_up_to_limit_then_blocks(self):
        client = make_client()
        for _ in range(AUTH_MAX_REQUESTS):
            r = client.post("/api/v1/users/login")
            assert r.status_code == 200
        r = client.post("/api/v1/users/login")
        assert r.status_code == 429
        assert "Retry-After" in r.headers

    def test_window_expiry_lets_requests_through_again(self):
        client = make_client()
        for _ in range(AUTH_MAX_REQUESTS):
            client.post("/api/v1/users/login")
        assert client.post("/api/v1/users/login").status_code == 429

        # Simulate the window elapsing.
        key = next(iter(_AUTH_RATE_LIMIT_STORE))
        _AUTH_RATE_LIMIT_STORE[key] = [
            t - AUTH_WINDOW_SECONDS - 1 for t in _AUTH_RATE_LIMIT_STORE[key]
        ]
        assert client.post("/api/v1/users/login").status_code == 200

    def test_untrusted_client_cannot_spoof_xff_to_bypass(self):
        """Attacker controls headers; XFF from a non-proxy peer must be ignored."""
        client = make_client()
        # Try to appear as many different IPs via XFF.
        for i in range(AUTH_MAX_REQUESTS + 5):
            r = client.post(
                "/api/v1/users/login",
                headers={"X-Forwarded-For": f"10.0.0.{i}"},
            )
            if i < AUTH_MAX_REQUESTS:
                assert r.status_code == 200, f"request {i} should pass"
        # The 26th+ attempt must still be rate limited — spoofing failed.
        assert client.post(
            "/api/v1/users/login", headers={"X-Forwarded-For": "10.9.9.9"}
        ).status_code == 429

    def test_progressive_penalty_grows_with_offenses(self):
        client = make_client()
        for _ in range(AUTH_MAX_REQUESTS):
            client.post("/api/v1/users/login")
        first = client.post("/api/v1/users/login")
        assert first.status_code == 429
        first_retry = int(first.headers["Retry-After"])

        # Keep hammering after the block; the penalty must escalate, not reset.
        for _ in range(AUTH_MAX_REQUESTS):
            client.post("/api/v1/users/login")
        second = client.post("/api/v1/users/login")
        assert second.status_code == 429
        second_retry = int(second.headers["Retry-After"])
        assert second_retry > first_retry

    def test_global_and_auth_stores_are_separate(self):
        client = make_client()
        # Auth limit hit doesn't pre-block a normal path.
        for _ in range(AUTH_MAX_REQUESTS):
            client.post("/api/v1/users/login")
        assert client.get("/health").status_code == 200

    def test_testclient_loopback_is_direct_client(self):
        """The TestClient's peer is loopback ('testclient'); with the default
        trust list the middleware treats it as a direct client and must NOT
        hop through XFF."""
        assert "testclient" not in TRUSTED_PROXIES


class TestAccountLockout:
    """Per-account lockout lives in app.routes.auth — verify its state machine."""

    def test_lockout_after_max_failures(self):
        from app.routes.auth import (
            MAX_FAILED_LOGINS,
            _account_lockout_state,
            _record_failed_login,
        )

        email = "bruteforce@example.com"
        for _ in range(MAX_FAILED_LOGINS):
            _record_failed_login(email)
        remaining, locked_for = _account_lockout_state(email)
        assert remaining == 0
        assert locked_for > 0

    def test_successful_style_reset_clears_state(self):
        from app.routes.auth import (
            MAX_FAILED_LOGINS,
            _account_lockout_state,
            _clear_failed_logins,
            _record_failed_login,
        )

        email = "reset@example.com"
        for _ in range(MAX_FAILED_LOGINS - 1):
            _record_failed_login(email)
        _clear_failed_logins(email)
        remaining, locked_for = _account_lockout_state(email)
        assert remaining == MAX_FAILED_LOGINS
        assert locked_for == 0.0

    def test_email_case_insensitive(self):
        from app.routes.auth import MAX_FAILED_LOGINS, _account_lockout_state, _record_failed_login

        _record_failed_login("MiXeD@Example.com ")
        for _ in range(MAX_FAILED_LOGINS - 1):
            _record_failed_login("mixed@example.com")
        remaining, locked_for = _account_lockout_state("MIXED@EXAMPLE.com")
        assert remaining == 0 and locked_for > 0

    def test_old_failures_expire_out_of_window(self):
        from app.routes.auth import MAX_FAILED_LOGINS, _account_lockout_state
        from app.routes.auth import _failed_logins

        email = "stale@example.com"
        key = email
        _failed_logins[key] = [time.time() - 16 * 60] * (MAX_FAILED_LOGINS - 1)
        remaining, locked_for = _account_lockout_state(email)
        assert remaining == MAX_FAILED_LOGINS
        assert locked_for == 0.0
        _failed_logins.pop(key, None)
