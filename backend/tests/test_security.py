import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.utils.security import hash_password, verify_password


class TestSecurityUtils(unittest.TestCase):
    def test_hash_and_verify_success(self):
        password = "SuperSecretPassword123!"
        hashed = hash_password(password)
        self.assertNotEqual(password, hashed)
        self.assertTrue(verify_password(password, hashed))

    def test_verify_wrong_password_fails(self):
        password = "CorrectPassword123"
        hashed = hash_password(password)
        self.assertFalse(verify_password("WrongPassword123", hashed))

    def test_verify_empty_password_fails(self):
        self.assertFalse(verify_password("", "somehash"))
        self.assertFalse(verify_password("mypassword", ""))
        self.assertFalse(verify_password("mypassword", None))

    def test_legacy_plaintext_fallback(self):
        self.assertTrue(verify_password("plaintext123", "plaintext123"))
        self.assertFalse(verify_password("plaintext123", "differenttext"))


if __name__ == "__main__":
    unittest.main()
