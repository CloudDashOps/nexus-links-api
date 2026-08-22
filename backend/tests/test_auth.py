"""Integration tests: registration, login, token auth, rate limiting."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import register_and_login


class TestRegistration:
    def test_register_success(self, client):
        resp = client.post(
            "/auth/register",
            json={"username": "bob", "email": "bob@example.com", "password": "Passw0rd123"},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["token_type"] == "bearer"
        assert body["access_token"]

    def test_duplicate_email_conflict(self, client):
        payload = {"username": "bob", "email": "bob@example.com", "password": "Passw0rd123"}
        client.post("/auth/register", json=payload)
        resp = client.post("/auth/register", json=payload)
        assert resp.status_code == 409

    def test_weak_password_rejected(self, client):
        resp = client.post(
            "/auth/register",
            json={"username": "weak", "email": "weak@example.com", "password": "short"},
        )
        assert resp.status_code == 422

    def test_invalid_email_rejected(self, client):
        resp = client.post(
            "/auth/register",
            json={"username": "x", "email": "not-an-email", "password": "Passw0rd123"},
        )
        assert resp.status_code == 422


class TestLogin:
    def test_login_success(self, client):
        client.post(
            "/auth/register",
            json={"username": "carol", "email": "carol@example.com", "password": "Passw0rd123"},
        )
        resp = client.post("/auth/login", json={"email": "carol@example.com", "password": "Passw0rd123"})
        assert resp.status_code == 200
        assert resp.json()["access_token"]

    def test_wrong_password(self, client):
        client.post(
            "/auth/register",
            json={"username": "dave", "email": "dave@example.com", "password": "Passw0rd123"},
        )
        resp = client.post("/auth/login", json={"email": "dave@example.com", "password": "WrongPass1"})
        assert resp.status_code == 401

    def test_unknown_email_same_error_as_wrong_password(self, client):
        resp = client.post("/auth/login", json={"email": "ghost@example.com", "password": "Passw0rd123"})
        assert resp.status_code == 401
        # No user enumeration: same detail as wrong-password
        resp2 = client.post("/auth/login", json={"email": "dave@example.com", "password": "WrongPass1"})
        assert resp.json()["detail"] == resp2.json()["detail"]

    def test_email_case_insensitive_login(self, client):
        client.post(
            "/auth/register",
            json={"username": "erin", "email": "erin@example.com", "password": "Passw0rd123"},
        )
        resp = client.post("/auth/login", json={"email": "ERIN@EXAMPLE.COM", "password": "Passw0rd123"})
        assert resp.status_code == 200


class TestRateLimiting:
    def test_too_many_auth_attempts_blocked(self, client):
        for i in range(10):
            client.post("/auth/login", json={"email": f"u{i}@example.com", "password": "Passw0rd123"})
        resp = client.post("/auth/login", json={"email": "final@example.com", "password": "Passw0rd123"})
        assert resp.status_code == 429

    def test_successful_logins_do_not_burn_quota(self, client):
        """Normal usage must never trip the limiter — only failures count."""
        register_and_login(client, "quota@example.com")
        for _ in range(20):
            resp = client.post(
                "/auth/login", json={"email": "quota@example.com", "password": "Passw0rd123"}
            )
            assert resp.status_code == 200, resp.text

    def test_mixed_success_then_failures_still_limited(self, client):
        """Successes don't charge the budget, but 10 failures still do."""
        client.post(
            "/auth/register",
            json={"username": "mixer", "email": "mixer@example.com", "password": "Passw0rd123"},
        )
        # Successful logins interleaved with failures — successes are free
        for i in range(5):
            ok = client.post(
                "/auth/login", json={"email": "mixer@example.com", "password": "Passw0rd123"}
            )
            assert ok.status_code == 200
            bad = client.post(
                "/auth/login", json={"email": "mixer@example.com", "password": f"Wrong{i}Pass1"}
            )
            assert bad.status_code == 401
        # 5 failures recorded so far; 5 more reach the limit
        for i in range(5):
            bad = client.post(
                "/auth/login", json={"email": "mixer@example.com", "password": f"Nope{i}Pass1"}
            )
            assert bad.status_code == 401
        resp = client.post(
            "/auth/login", json={"email": "mixer@example.com", "password": "Passw0rd123"}
        )
        assert resp.status_code == 429


class TestMe:
    def test_get_me_with_token(self, client):
        headers = register_and_login(client, "me@example.com")
        resp = client.get("/auth/users/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "me@example.com"

    def test_get_me_without_token(self, client):
        assert client.get("/auth/users/me").status_code in (401, 403)

    def test_get_me_with_garbage_token(self, client):
        resp = client.get("/auth/users/me", headers={"Authorization": "Bearer garbage.token.here"})
        assert resp.status_code == 401
