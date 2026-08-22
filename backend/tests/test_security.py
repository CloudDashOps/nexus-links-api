"""Unit + integration tests for the auth security layer.

Covers app/security.py (password hashing, JWT create/decode, get_current_user)
and the auth endpoints' security-relevant edge cases (expired / tampered /
orphaned tokens, case-insensitive duplicate emails).
"""

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jose import jwt

from app.config import ALGORITHM, SECRET_KEY
from app.database import SessionLocal
from app.models import User
from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_and_verify_roundtrip(self):
        hashed = hash_password("Passw0rd123")
        assert hashed != "Passw0rd123"
        assert verify_password("Passw0rd123", hashed) is True

    def test_wrong_password_fails(self):
        hashed = hash_password("Passw0rd123")
        assert verify_password("WrongPass1", hashed) is False

    def test_passwords_are_salted(self):
        # Same password hashed twice must produce different hashes (bcrypt salt)
        assert hash_password("Passw0rd123") != hash_password("Passw0rd123")

    def test_malformed_hash_returns_false_not_crash(self):
        assert verify_password("Passw0rd123", "not-a-bcrypt-hash") is False

    def test_empty_hash_returns_false(self):
        assert verify_password("Passw0rd123", "") is False


class TestTokenUnit:
    def test_create_decode_roundtrip(self):
        token = create_access_token({"sub": "user@example.com"})
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user@example.com"

    def test_token_has_exp_claim(self):
        payload = decode_access_token(create_access_token({"sub": "a@b.com"}))
        assert "exp" in payload

    def test_garbage_token_returns_none(self):
        assert decode_access_token("garbage.token.here") is None

    def test_empty_token_returns_none(self):
        assert decode_access_token("") is None

    def test_tampered_signature_returns_none(self):
        token = create_access_token({"sub": "user@example.com"})
        tampered = token[:-2] + ("aa" if token[-2:] != "aa" else "bb")
        assert decode_access_token(tampered) is None

    def test_token_signed_with_wrong_key_returns_none(self):
        forged = jwt.encode(
            {"sub": "user@example.com", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            "some-other-secret-key-that-is-long-enough",
            algorithm=ALGORITHM,
        )
        assert decode_access_token(forged) is None


class TestTokenAuthEndpoints:
    def test_expired_token_rejected_401(self, client):
        expired = jwt.encode(
            {"sub": "expired@example.com", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        resp = client.get("/auth/users/me", headers={"Authorization": f"Bearer {expired}"})
        assert resp.status_code == 401

    def test_token_without_sub_rejected_401(self, client):
        token = jwt.encode(
            {"exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        resp = client.get("/auth/users/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401

    def test_token_for_deleted_user_rejected_401(self, client):
        email = "doomed@example.com"
        client.post(
            "/auth/register",
            json={"username": "doomed", "email": email, "password": "Passw0rd123"},
        )
        resp = client.post("/auth/login", json={"email": email, "password": "Passw0rd123"})
        headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

        # Delete the user behind the token's back
        db = SessionLocal()
        try:
            db.query(User).filter(User.email == email).delete()
            db.commit()
        finally:
            db.close()

        resp = client.get("/auth/users/me", headers=headers)
        assert resp.status_code == 401

    def test_malformed_authorization_header_rejected(self, client):
        resp = client.get("/auth/users/me", headers={"Authorization": "Token abc.def.ghi"})
        assert resp.status_code in (401, 403)

    def test_register_returns_token_that_authenticates(self, client):
        resp = client.post(
            "/auth/register",
            json={"username": "flow", "email": "flow@example.com", "password": "Passw0rd123"},
        )
        token = resp.json()["access_token"]
        me = client.get("/auth/users/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == "flow@example.com"


class TestEmailNormalisation:
    def test_duplicate_email_different_case_conflict_409(self, client):
        """Registering Bob@Example.com then bob@example.com must be a clean
        409, not a crash — the duplicate check must be case-insensitive."""
        payload = {"username": "casey", "email": "Casey@Example.com", "password": "Passw0rd123"}
        assert client.post("/auth/register", json=payload).status_code == 201
        dup = {"username": "casey2", "email": "casey@example.com", "password": "Passw0rd123"}
        resp = client.post("/auth/register", json=dup)
        assert resp.status_code == 409

    def test_registered_email_stored_lowercase(self, client):
        client.post(
            "/auth/register",
            json={"username": "lower", "email": "MiXeD@ExAmPlE.CoM", "password": "Passw0rd123"},
        )
        resp = client.post("/auth/login", json={"email": "mixed@example.com", "password": "Passw0rd123"})
        assert resp.status_code == 200
