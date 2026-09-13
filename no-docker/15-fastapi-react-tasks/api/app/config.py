"""Settings read from environment variables (see ../.env.example)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    return default if value is None else value.strip().lower() in {"1", "true", "yes", "on"}


APP_NAME = "Orbit Tasks API"
VERSION = "1.0.0"

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-demo-orbit-jwt-secret")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = int(os.environ.get("ACCESS_TOKEN_MINUTES", "60"))

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/orbit.db")

CORS_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5015,http://127.0.0.1:5015").split(",") if o.strip()
]

AUTO_SEED = env_bool("AUTO_SEED", True)
