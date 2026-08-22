from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

import logging

from app import models
from app.config import CORS_ORIGINS, ENV
from app.database import engine, masked_database_url
from app.routers import auth, links, redirect

# Auto-create database tables on startup (fine for SQLite/first boot;
# use Alembic migrations for evolving production schemas).
models.Base.metadata.create_all(bind=engine)


def ensure_schema(target_engine=None) -> None:
    """Backfill any column that exists on a model but not in its table.

    Base.metadata.create_all() only creates MISSING tables — it never alters
    existing ones. Databases created before later model changes (e.g.
    users.is_active, links.owner_id) would crash every query touching those
    columns with 'no such column: ...'. This compares each mapped table
    against the live schema and ALTERs in whatever is missing, preserving
    all existing data.
    """
    target_engine = target_engine or engine
    log = logging.getLogger("nexuslinks")
    with target_engine.connect() as conn:
        insp = inspect(conn)
        existing_tables = set(insp.get_table_names())
        for table in models.Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue  # fresh table — create_all already handled it
            existing_columns = {c["name"] for c in insp.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue

                col_type = column.type.compile(target_engine.dialect)
                ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}'

                # Foreign keys need an explicit REFERENCES clause in SQLite
                fk = next(iter(column.foreign_keys), None)
                if fk is not None:
                    ddl += f' REFERENCES "{fk.column.table.name}" ({fk.column.name})'

                # SQLite cannot add a NOT NULL column without a default
                default_sql = ""
                if column.server_default is not None:
                    default_sql = f" DEFAULT {column.server_default.arg}"
                elif column.default is not None and hasattr(column.default, "arg"):
                    arg = column.default.arg
                    literal = {True: "1", False: "0"}.get(arg, str(arg) if isinstance(arg, (int, float)) else None)
                    if literal is not None:
                        default_sql = f" DEFAULT {literal}"
                if not column.nullable and not default_sql:
                    log.warning(
                        "Cannot backfill non-nullable %s.%s without a default; adding as NULLable",
                        table.name,
                        column.name,
                    )
                elif not column.nullable:
                    ddl += " NOT NULL"
                ddl += default_sql

                conn.execute(text(ddl))
                log.info("Migrated %s: added missing column '%s'", table.name, column.name)
        conn.commit()


# Kept for compatibility with earlier imports/tests
ensure_users_schema = ensure_schema


ensure_schema()

logging.basicConfig(level=logging.INFO)
logging.getLogger("nexuslinks").info(
    "Starting in %s mode | database: %s | CORS: %s",
    ENV,
    masked_database_url(),
    ", ".join(CORS_ORIGINS),
)

app = FastAPI(
    title="NexusLink API",
    description="High-performance URL Shortener with Asynchronous Analytics Tracking",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/", tags=["Root"])
def home():
    return {"Message": "NexusLinks API is live and connected to the Database!"}


@app.get("/health", tags=["Root"])
def health():
    """Liveness probe used by Render health checks."""
    return {"status": "ok"}


# Include routers
app.include_router(auth.router)
app.include_router(links.router)
# Redirect router must be last since it catches /{short_code}
app.include_router(redirect.router)