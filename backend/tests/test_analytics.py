"""Integration tests: QR codes, Link Intelligence analytics, CSV export."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import register_and_login


def _create_link(client, headers, **overrides):
    payload = {"target_url": "https://example.com/landing", **overrides}
    resp = client.post("/links/", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestQr:
    def test_qr_returns_png(self, client, auth_headers):
        link = _create_link(client, auth_headers)
        resp = client.get(f"/links/{link['id']}/qr", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/png"
        assert resp.content[:4] == b"\x89PNG"

    def test_qr_requires_ownership(self, client):
        alice = register_and_login(client, "alice-q@example.com")
        bob = register_and_login(client, "bob-q@example.com")
        link_id = _create_link(client, alice)["id"]
        assert client.get(f"/links/{link_id}/qr", headers=bob).status_code == 404


class TestAnalytics:
    def test_analytics_shape_and_counts(self, client, auth_headers):
        link = _create_link(client, auth_headers)
        code = link["short_code"]

        client.get(f"/{code}", headers={"User-Agent": "Mozilla/5.0 Chrome/120.0 Safari/537.36", "Referer": "https://twitter.com"})
        client.get(f"/{code}", headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS) AppleWebKit Safari/604.1"})
        client.get(f"/{code}", headers={"User-Agent": "Mozilla/5.0 Chrome/119.0 Safari/537.36"})

        resp = client.get(f"/links/{link['id']}/analytics", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()

        assert body["total_clicks"] == 3
        assert body["referrer_counts"].get("https://twitter.com") == 1
        assert body["referrer_counts"].get("direct") == 2
        assert body["device_counts"].get("Desktop") == 2
        assert body["device_counts"].get("Mobile") == 1
        assert body["browser_counts"].get("Chrome") == 2
        assert body["browser_counts"].get("Safari") == 1

        assert len(body["daily_clicks"]) == 30  # default window, zero-filled
        assert sum(d["count"] for d in body["daily_clicks"]) == 3
        assert isinstance(body["heatmap"], dict)

    def test_days_parameter_clamped(self, client, auth_headers):
        link = _create_link(client, auth_headers)
        resp = client.get(f"/links/{link['id']}/analytics?days=99999", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()["daily_clicks"]) == 365

    def test_analytics_requires_ownership(self, client):
        alice = register_and_login(client, "alice-a@example.com")
        bob = register_and_login(client, "bob-a@example.com")
        link_id = _create_link(client, alice)["id"]
        assert client.get(f"/links/{link_id}/analytics", headers=bob).status_code == 404


class TestCsvExport:
    def test_export_returns_csv(self, client, auth_headers):
        link = _create_link(client, auth_headers)
        client.get(f"/{link['short_code']}", headers={"User-Agent": "Mozilla/5.0 Chrome/120.0 Safari/537.36"})

        resp = client.get(f"/links/{link['id']}/export", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/csv")
        lines = resp.text.strip().splitlines()
        assert lines[0] == "timestamp,referrer,device,browser"
        assert len(lines) == 2
        assert "Chrome" in lines[1] and "Desktop" in lines[1]

    def test_export_requires_ownership(self, client):
        alice = register_and_login(client, "alice-c@example.com")
        bob = register_and_login(client, "bob-c@example.com")
        link_id = _create_link(client, alice)["id"]
        assert client.get(f"/links/{link_id}/export", headers=bob).status_code == 404


class TestHealth:
    def test_health_endpoint(self, client):
        assert client.get("/health").json() == {"status": "ok"}