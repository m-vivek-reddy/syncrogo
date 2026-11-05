import asyncio
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from starlette.requests import Request
from starlette.responses import Response

from app.middleware import security


class TestLoginRateLimit(unittest.TestCase):
    def setUp(self):
        security._AUTH_RATE_LIMIT_STORE.clear()
        security._RATE_LIMIT_STORE.clear()
        self.middleware = security.RateLimitAndBotProtectionMiddleware(lambda _: None)

    def request(self, path="/login", forwarded="203.0.113.1"):
        return Request({
            "type": "http", "http_version": "1.1", "method": "POST",
            "scheme": "http", "path": path, "raw_path": path.encode(),
            "query_string": b"", "headers": [(b"x-forwarded-for", forwarded.encode())],
            "client": ("192.0.2.10", 1234), "server": ("test", 80),
        })

    async def call(self, request):
        return await self.middleware.dispatch(request, lambda _: asyncio.sleep(0, result=Response()))

    def test_login_is_limited_by_peer_ip_not_forwarded_header(self):
        async def exercise():
            for i in range(security.LOGIN_MAX_REQUESTS):
                self.assertEqual((await self.call(self.request(forwarded=f"198.51.100.{i}"))).status_code, 200)
            limited = await self.call(self.request(forwarded="198.51.100.99"))
            self.assertEqual(limited.status_code, 429)
            self.assertEqual(limited.headers["Retry-After"], "60")

        asyncio.run(exercise())

    def test_login_rate_limit_does_not_match_similar_paths(self):
        async def exercise():
            for _ in range(security.LOGIN_MAX_REQUESTS + 1):
                self.assertEqual((await self.call(self.request("/login-other"))).status_code, 200)

        asyncio.run(exercise())


if __name__ == "__main__":
    unittest.main()
