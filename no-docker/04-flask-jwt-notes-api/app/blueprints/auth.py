from flask import Blueprint, g, jsonify

from ..auth_utils import decode_token, require_auth, token_pair
from ..errors import APIError
from ..extensions import db
from ..models import User
from ..validation import json_body, require_fields, validate_email, validate_password

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.post("/register")
def register():
    data = require_fields(json_body(), "email", "password")
    email = validate_email(data["email"])
    password = validate_password(data["password"])
    if User.query.filter_by(email=email).first():
        raise APIError(409, "An account with this email already exists", "email_taken")
    user = User(email=email, name=str(data.get("name") or email.split("@")[0]).strip()[:120], role="user")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"user": user.to_dict(), **token_pair(user)}), 201


@bp.post("/login")
def login():
    data = require_fields(json_body(), "email", "password")
    user = User.query.filter_by(email=str(data["email"]).strip().lower()).first()
    if user is None or not user.check_password(str(data["password"])):
        raise APIError(401, "Invalid email or password", "invalid_credentials")
    return jsonify({"user": user.to_dict(), **token_pair(user)})


@bp.post("/refresh")
def refresh():
    data = require_fields(json_body(), "refresh_token")
    claims = decode_token(str(data["refresh_token"]), "refresh")
    user = db.session.get(User, int(claims["sub"]))
    if user is None:
        raise APIError(401, "User for this token no longer exists", "unknown_user")
    return jsonify(token_pair(user))


@bp.get("/me")
@require_auth()
def me():
    return jsonify({"user": g.current_user.to_dict(include_stats=True), "claims": {
        "sub": g.claims["sub"], "role": g.claims["role"], "exp": g.claims["exp"], "jti": g.claims["jti"]}})
