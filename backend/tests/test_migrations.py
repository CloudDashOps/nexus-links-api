"""Regression tests: startup migration for databases created before later
model columns existed (create_all never alters existing tables).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, inspect, text

from app.main import ensure_schema


def _make_stale_users_db(path: str):
    """Create a users table with the OLD schema (no is_active column)."""
    engine = create_engine(f"sqlite:///{path}")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    username VARCHAR(50) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    hashed_password VARCHAR(255) NOT NULL,
                    created_at DATETIME
                )
                """
            )
        )
        conn.execute(
            text(
                "INSERT INTO users (username, email, hashed_password) "
                "VALUES ('legacy', 'legacy@example.com', 'legacy-hash')"
            )
        )
    return engine


def _make_stale_links_db(path: str):
    """Create a links table with the OLD schema (no owner_id column)."""
    engine = create_engine(f"sqlite:///{path}")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    username VARCHAR(50) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    hashed_password VARCHAR(255) NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE links (
                    id INTEGER PRIMARY KEY,
                    target_url VARCHAR(2048) NOT NULL,
                    short_code VARCHAR(100) NOT NULL UNIQUE,
                    custom_slug VARCHAR(100),
                    title VARCHAR(200),
                    clicks INTEGER NOT NULL DEFAULT 0,
                    expires_at DATETIME,
                    created_at DATETIME
                )
                """
            )
        )
        conn.execute(
            text(
                "INSERT INTO links (target_url, short_code) "
                "VALUES ('https://example.com/old', 'oldcode')"
            )
        )
        conn.execute(text("INSERT INTO users (username, email, hashed_password) VALUES ('u', 'u@x.com', 'h')"))
    return engine


def _column_names(engine, table):
    with engine.connect() as conn:
        return {c["name"] for c in inspect(conn).get_columns(table)}


def test_migration_adds_missing_is_active_column(tmp_path):
    engine = _make_stale_users_db(str(tmp_path / "stale.db"))
    assert "is_active" not in _column_names(engine, "users")

    ensure_schema(engine)

    assert "is_active" in _column_names(engine, "users")


def test_migration_adds_missing_owner_id_column(tmp_path):
    """The exact bug from production: links table predates owner_id."""
    engine = _make_stale_links_db(str(tmp_path / "stale.db"))
    assert "owner_id" not in _column_names(engine, "links")

    ensure_schema(engine)

    assert "owner_id" in _column_names(engine, "links")


def test_migration_preserves_existing_rows(tmp_path):
    db_path = str(tmp_path / "stale.db")
    engine = _make_stale_users_db(db_path)

    ensure_schema(engine)

    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT username, email, is_active FROM users WHERE email = 'legacy@example.com'")
        ).fetchone()
    assert row.username == "legacy"
    assert row.email == "legacy@example.com"
    assert row.is_active == 1  # backfilled default


def test_migrated_links_keep_rows_with_null_owner(tmp_path):
    """Legacy links survive the owner_id backfill as owner-less rows."""
    engine = _make_stale_links_db(str(tmp_path / "stale.db"))

    ensure_schema(engine)

    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT short_code, owner_id FROM links WHERE short_code = 'oldcode'")
        ).fetchone()
        user_id = conn.execute(text("SELECT id FROM users WHERE email = 'u@x.com'")).fetchone()[0]
        # New links can be assigned to their owner via the FK
        conn.execute(
            text("INSERT INTO links (target_url, short_code, owner_id) VALUES ('https://x.com', 'newcode', :uid)"),
            {"uid": user_id},
        )
        new_row = conn.execute(text("SELECT owner_id FROM links WHERE short_code = 'newcode'")).fetchone()
    assert row.short_code == "oldcode"
    assert row.owner_id is None
    assert new_row.owner_id == user_id


def test_migration_is_idempotent(tmp_path):
    engine = _make_stale_users_db(str(tmp_path / "stale.db"))
    ensure_schema(engine)
    # Second run must not raise (column already exists)
    ensure_schema(engine)
    assert "is_active" in _column_names(engine, "users")


def test_migration_skips_up_to_date_schema(tmp_path):
    """A database already having is_active must be left untouched."""
    engine = _make_stale_users_db(str(tmp_path / "stale.db"))
    ensure_schema(engine)
    before = _column_names(engine, "users")
    ensure_schema(engine)
    assert _column_names(engine, "users") == before

