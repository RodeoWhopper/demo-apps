"""JWT helpers: token creation, verification and route decorators."""
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, request

from .errors import APIError
from .extensions import db
from .models import User


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user: User) -> str:
    cfg = current_app.config
    now = _now()
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=cfg["JWT_ACCESS_MINUTES"]),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, cfg["JWT_SECRET"], algorithm=cfg["JWT_ALGORITHM"])


def create_refresh_token(user: User) -> str:
    cfg = current_app.config
    now = _now()
    payload = {
        "sub": str(user.id),
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=cfg["JWT_REFRESH_DAYS"]),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, cfg["JWT_SECRET"], algorithm=cfg["JWT_ALGORITHM"])


def token_pair(user: User) -> dict:
    cfg = current_app.config
    return {
        "token_type": "Bearer",
        "access_token": create_access_token(user),
        "expires_in": cfg["JWT_ACCESS_MINUTES"] * 60,
        "refresh_token": create_refresh_token(user),
        "refresh_expires_in": cfg["JWT_REFRESH_DAYS"] * 86400,
    }


def decode_token(token: str, expected_type: str) -> dict:
    cfg = current_app.config
    try:
        claims = jwt.decode(
            token,
            cfg["JWT_SECRET"],
            algorithms=[cfg["JWT_ALGORITHM"]],
            options={"require": ["exp", "iat", "sub", "type"]},
        )
    except jwt.ExpiredSignatureError:
        raise APIError(401, "Token has expired", "token_expired")
    except jwt.InvalidTokenError:
        raise APIError(401, "Invalid token", "invalid_token")
    if claims.get("type") != expected_type:
        raise APIError(401, f"Expected a {expected_type} token", "wrong_token_type")
    return claims


def _bearer_token() -> str:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise APIError(401, "Missing or malformed Authorization header (expected: Bearer <token>)", "missing_token")
    return token.strip()


def require_auth(role: str | None = None):
    """Protect a view with a Bearer access token; optionally require a role claim."""

    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            claims = decode_token(_bearer_token(), "access")
            user = db.session.get(User, int(claims["sub"]))
            if user is None:
                raise APIError(401, "User for this token no longer exists", "unknown_user")
            if role is not None and claims.get("role") != role:
                raise APIError(403, f"This endpoint requires the '{role}' role", "insufficient_role")
            g.current_user = user
            g.claims = claims
            return view(*args, **kwargs)

        return wrapper

    return decorator
