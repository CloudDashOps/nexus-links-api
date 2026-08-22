"""Integration tests: link CRUD and ownership scoping."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import register_and_login


def _create_link(client, headers, **overrides):
    payload = {"target_url": "https://example.com/landing", **overrides}
    return client.post("/links/", json=payload, headers=headers)


class TestCreateLink:
    def test_create_auto_slug(self, client, auth_headers):
        resp = _create_link(client, auth_headers)
        assert resp.status_code == 201
        body = resp.json()
        assert len(body["short_code"]) == 7
        assert body["clicks"] == 0
        assert body["target_url"].rstrip("/") == "https://example.com/landing"

    def test_create_with_custom_slug(self, client, auth_headers):
        resp = _create_link(client, auth_headers, custom_slug="my-campaign")
        assert resp.status_code == 201
        assert resp.json()["short_code"] == "my-campaign"

    def test_duplicate_custom_slug_rejected(self, client, auth_headers):
        _create_link(client, auth_headers, custom_slug="dup-slug")
        resp = _create_link(client, auth_headers, custom_slug="dup-slug")
        assert resp.status_code == 400

    def test_invalid_slug_rejected(self, client, auth_headers):
        resp = _create_link(client, auth_headers, custom_slug="bad slug!")
        assert resp.status_code == 422

    def test_requires_auth(self, client):
        resp = client.post("/links/", json={"target_url": "https://example.com"})
        assert resp.status_code in (401, 403)

    def test_auto_slugs_are_unique(self, client, auth_headers):
        codes = {_create_link(client, auth_headers).json()["short_code"] for _ in range(5)}
        assert len(codes) == 5


class TestOwnershipScoping:
    def test_user_only_sees_own_links(self, client):
        alice = register_and_login(client, "alice-l@example.com")
        bob = register_and_login(client, "bob-l@example.com")

        _create_link(client, alice, custom_slug="alice-only")
        _create_link(client, bob, custom_slug="bob-only")

        alice_list = {l["short_code"] for l in client.get("/links/", headers=alice).json()}
        bob_list = {l["short_code"] for l in client.get("/links/", headers=bob).json()}

        assert "alice-only" in alice_list and "bob-only" not in alice_list
        assert "bob-only" in bob_list and "alice-only" not in bob_list

    def test_cannot_read_foreign_link(self, client):
        alice = register_and_login(client, "alice-r@example.com")
        bob = register_and_login(client, "bob-r@example.com")
        link_id = _create_link(client, alice, custom_slug="alice-secret").json()["id"]

        assert client.get(f"/links/{link_id}", headers=bob).status_code == 404

    def test_cannot_update_foreign_link(self, client):
        alice = register_and_login(client, "alice-u@example.com")
        bob = register_and_login(client, "bob-u@example.com")
        link_id = _create_link(client, alice, custom_slug="alice-upd").json()["id"]

        resp = client.put(
            f"/links/{link_id}",
            json={"target_url": "https://evil.com"},
            headers=bob,
        )
        assert resp.status_code == 404
        assert client.get(f"/links/{link_id}", headers=alice).json()["target_url"].startswith("https://example.com")

    def test_cannot_delete_foreign_link(self, client):
        alice = register_and_login(client, "alice-d@example.com")
        bob = register_and_login(client, "bob-d@example.com")
        link_id = _create_link(client, alice, custom_slug="alice-del").json()["id"]

        assert client.delete(f"/links/{link_id}", headers=bob).status_code == 404
        assert client.get(f"/links/{link_id}", headers=alice).status_code == 200


class TestUpdateDelete:
    def test_update_target(self, client, auth_headers):
        link_id = _create_link(client, auth_headers).json()["id"]
        resp = client.put(f"/links/{link_id}", json={"target_url": "https://new.com"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["target_url"].startswith("https://new.com")

    def test_update_to_taken_slug(self, client, auth_headers):
        _create_link(client, auth_headers, custom_slug="slug-a")
        link_id = _create_link(client, auth_headers).json()["id"]
        resp = client.put(
            f"/links/{link_id}",
            json={"target_url": "https://x.com", "custom_slug": "slug-a"},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_delete_link(self, client, auth_headers):
        link_id = _create_link(client, auth_headers).json()["id"]
        assert client.delete(f"/links/{link_id}", headers=auth_headers).status_code == 204
        assert client.get(f"/links/{link_id}", headers=auth_headers).status_code == 404

    def test_get_missing_link_404(self, client, auth_headers):
        assert client.get("/links/999999", headers=auth_headers).status_code == 404