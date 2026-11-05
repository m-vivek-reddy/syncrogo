import unittest
import sys
import os
from pydantic import ValidationError

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.utils.security import hash_password, verify_password
from app.schemas.user import UserCreate


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

    def test_passwords_over_bcrypt_byte_limit_are_rejected(self):
        prefix = "a" * 72
        hashed = hash_password(prefix)

        with self.assertRaises(ValueError):
            hash_password(prefix + "suffix")

        self.assertFalse(verify_password(prefix + "suffix", hashed))

    def test_password_limit_counts_utf8_bytes(self):
        exact_limit = "é" * 36
        hashed = hash_password(exact_limit)

        self.assertTrue(verify_password(exact_limit, hashed))
        with self.assertRaises(ValueError):
            hash_password(exact_limit + "é")

    def test_registration_rejects_password_over_bcrypt_byte_limit(self):
        with self.assertRaises(ValidationError):
            UserCreate(
                email="test@example.com",
                password="a" * 73,
            )

    def test_verify_empty_password_fails(self):
        self.assertFalse(verify_password("", "somehash"))
        self.assertFalse(verify_password("mypassword", ""))
        self.assertFalse(verify_password("mypassword", None))

    def test_plaintext_password_is_not_a_valid_hash(self):
        self.assertFalse(verify_password("plaintext123", "plaintext123"))
        self.assertFalse(verify_password("plaintext123", "differenttext"))


if __name__ == "__main__":
    unittest.main()
