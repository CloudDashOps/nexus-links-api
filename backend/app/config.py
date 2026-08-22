import os

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Application configuration (12-factor: everything comes from the environment)
# ---------------------------------------------------------------------------

ENV: str = os.getenv("ENV", "development")

SECRET_KEY: str | None = os.getenv("SECRET_KEY")
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./nexuslinks.db")

# Comma separated list of allowed browser origins (e.g. the deployed frontend)
CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

IS_PRODUCTION = ENV.lower() in ("production", "prod")

# Local development convenience: derive a per-process secret so the app runs
# out of the box. Production refuses to start without an explicit key.
if not SECRET_KEY and not IS_PRODUCTION:
    import secrets as _secrets

    SECRET_KEY = _secrets.token_urlsafe(48)


def validate_config() -> None:
    """Fail fast on insecure configuration instead of silently running."""
    if IS_PRODUCTION:
        if not SECRET_KEY or SECRET_KEY == "change-this-to-a-long-random-secret-key":
            raise RuntimeError(
                "REFUSING to start in production with a missing/default SECRET_KEY. "
                "Set the SECRET_KEY environment variable to a long random value."
            )
        if len(SECRET_KEY) < 32:
            raise RuntimeError("SECRET_KEY must be at least 32 characters long.")
        if "*" in CORS_ORIGINS:
            raise RuntimeError(
                "CORS_ORIGINS must not contain '*' in production. "
                "List explicit frontend origins instead."
            )


validate_config()
