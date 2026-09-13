import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


class Config:
    """All settings come from environment variables; defaults are for local demo use."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-demo-flask-secret")
    JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-demo-jwt-secret")
    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_MINUTES = _int("JWT_ACCESS_MINUTES", 15)
    JWT_REFRESH_DAYS = _int("JWT_REFRESH_DAYS", 7)

    DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", "data/scribble.db"))
    if not DATABASE_PATH.is_absolute():
        DATABASE_PATH = BASE_DIR / DATABASE_PATH

    SQLALCHEMY_DATABASE_URI = f"sqlite:///{DATABASE_PATH}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False

    AUTO_SEED = os.environ.get("AUTO_SEED", "1").strip().lower() in {"1", "true", "yes", "on"}
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
