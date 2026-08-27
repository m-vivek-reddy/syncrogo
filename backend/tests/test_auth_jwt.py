import unittest
import sys
import os
from datetime import timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.auth.jwt import create_access_token, decode_access_token


class TestAuthJWT(unittest.TestCase):
    def test_create_and_decode_token_success(self):
        payload = {"sub": "test@example.com", "role": "passenger", "user_id": 42}
        token = create_access_token(payload, expires_delta=timedelta(minutes=15))
        self.assertIsInstance(token, str)

        decoded = decode_access_token(token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded.get("sub"), "test@example.com")
        self.assertEqual(decoded.get("role"), "passenger")
        self.assertEqual(decoded.get("user_id"), 42)

    def test_expired_token_returns_none(self):
        payload = {"sub": "expired@example.com"}
        # Negative delta creates an expired token
        token = create_access_token(payload, expires_delta=timedelta(seconds=-10))
        decoded = decode_access_token(token)
        self.assertIsNone(decoded)

    def test_invalid_token_returns_none(self):
        decoded = decode_access_token("invalid.jwt.token")
        self.assertIsNone(decoded)


if __name__ == "__main__":
    unittest.main()
