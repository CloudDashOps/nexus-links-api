from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import DATABASE_URL

# Render/Heroku style URLs use the "postgres://" scheme which SQLAlchemy
# does not understand — normalise it to "postgresql://".
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Anchor relative SQLite paths to this backend folder so the app always uses
# the SAME database file no matter which directory the server is started from.
if DATABASE_URL.startswith("sqlite:///") and not DATABASE_URL.startswith("sqlite:////"):
    db_file = DATABASE_URL.removeprefix("sqlite:///")
    if not Path(db_file).is_absolute():
        db_file = str(Path(__file__).resolve().parent.parent / db_file)
        DATABASE_URL = f"sqlite:///{db_file}"

is_sqlite = DATABASE_URL.startswith("sqlite")

engine_kwargs: dict = {}
if is_sqlite:
    # SQLite needs this flag because FastAPI may touch the connection
    # from a different thread than the one that created it.
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Pre-pinged connections survive transient drops (Render free tier idles).
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def masked_database_url() -> str:
    """Database URL safe for logging (credentials hidden)."""
    url = DATABASE_URL
    if "@" in url and "://" in url:
        scheme, rest = url.split("://", 1)
        creds, _, host = rest.rpartition("@")
        if ":" in creds:
            user = creds.split(":", 1)[0]
            creds = f"{user}:***"
        return f"{scheme}://{creds}@{host}"
    return url


def get_db():
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
