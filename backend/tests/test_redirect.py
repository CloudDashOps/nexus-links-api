"""Integration tests: public redirect flow, expiry, safety."""

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import register_and_login


def _create(client, headers, **kw):
    resp = client.post("/links/", json={"target_url": "https://example.com/target", **kw}, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestRedirect:
    def test_redirects_to_target(self, client, auth_headers):
        link = _create(client, auth_headers, custom_slug="go-here")
        resp = client.get(f"/{link['short_code']}", follow_redirects=False)
        assert resp.status_code == 307
        assert resp.headers["location"] == "https://example.com/target"

    def test_click_counter_increments(self, client, auth_headers):
        link = _create(client, auth_headers, custom_slug="count-me")
        for _ in range(3):
            client.get(f"/{link['short_code']}", follow_redirects=False)
        refreshed = client.get(f"/links/{link['id']}", headers=auth_headers).json()
        assert refreshed["clicks"] == 3

    def test_unknown_code_404(self, client):
        assert client.get("/does-not-exist-xyz").status_code == 404

    def test_click_recorded_with_ua(self, client, auth_headers):
        link = _create(client, auth_headers, custom_slug="ua-test")
        client.get(
            f"/{link['short_code']}",
            headers={"User-Agent": "Mozilla/5.0 Firefox/121.0", "Referer": "https://news.ycombinator.com"},
            follow_redirects=False,
        )
        analytics = client.get(f"/links/{link['id']}/analytics", headers=auth_headers).json()
        assert analytics["browser_counts"].get("Firefox") == 1
        assert analytics["referrer_counts"].get("https://news.ycombinator.com") == 1


class TestExpiry:
    def test_expired_link_gone(self, client, auth_headers):
        past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        link = _create(client, auth_headers, custom_slug="expired", expires_at=past)
        resp = client.get(f"/{link['short_code']}", follow_redirects=False)
        assert resp.status_code == 410

    def test_future_expiry_still_works(self, client, auth_headers):
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        link = _create(client, auth_headers, custom_slug="not-expired", expires_at=future)
        resp = client.get(f"/{link['short_code']}", follow_redirects=False)
        assert resp.status_code == 307


class TestRedirectSafety:
    def test_unsafe_target_blocked_at_redirect(self, client, auth_headers):
        """Defence in depth: even if an unsafe URL lands in the DB
        (e.g. legacy data), the redirect endpoint refuses it."""
        from app.database import SessionLocal
        from app.models import LinkModel, User

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == "alice@example.com").first()
            link = LinkModel(target_url="javascript:alert(1)", short_code="unsafe1", owner_id=user.id if user else None)
            db.add(link)
            db.commit()
            link_id = link.id
        finally:
            db.close()

        resp = client.get("/unsafe1", follow_redirects=False)
        assert resp.status_code == 400
        client.delete(f"/links/{link_id}", headers=auth_headers)
