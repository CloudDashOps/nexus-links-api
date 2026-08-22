"""Test fixtures: isolated SQLite database + TestClient per test."""

import os
import sys

# Must be configured BEFORE importing anything from `app`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite:///./test_nexuslinks.db"
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-used-in-production-0123456789")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app
from app.routers.auth import auth_limiter


@pytest.fixture(scope="session", autouse=True)
def database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    auth_limiter.reset()
    yield
    auth_limiter.reset()


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def register_and_login(client: TestClient, email: str, password: str = "Passw0rd123") -> dict:
    """Register then log in; returns Authorization headers."""
    client.post(
        "/auth/register",
        json={"username": email.split("@")[0], "email": email, "password": password},
    )
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def auth_headers(client):
    return register_and_login(client, "alice@example.com")
