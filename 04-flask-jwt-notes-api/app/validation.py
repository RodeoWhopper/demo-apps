"""Tiny request-body validation helpers (kept dependency-free on purpose)."""
import re

from flask import request

from .errors import APIError

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def json_body() -> dict:
    data = request.get_json(silent=True)
    if data is None:
        raise APIError(400, "Request body must be valid JSON with Content-Type: application/json")
    if not isinstance(data, dict):
        raise APIError(400, "JSON body must be an object")
    return data


def require_fields(data: dict, *fields: str) -> dict:
    errors = {f: "This field is required" for f in fields if data.get(f) in (None, "")}
    if errors:
        raise APIError(422, "Validation failed", details=errors)
    return data


def validate_email(value) -> str:
    if not isinstance(value, str) or not EMAIL_RE.match(value.strip()):
        raise APIError(422, "Validation failed", details={"email": "Must be a valid email address"})
    return value.strip().lower()


def validate_password(value) -> str:
    if not isinstance(value, str) or len(value) < 8:
        raise APIError(422, "Validation failed", details={"password": "Must be at least 8 characters"})
    return value


def validate_note_fields(data: dict, partial: bool = False) -> dict:
    """Return a cleaned dict with only the note fields present in `data`."""
    errors = {}
    cleaned = {}

    if "title" in data or not partial:
        title = data.get("title")
        if not isinstance(title, str) or not title.strip():
            errors["title"] = "Title is required and must be a non-empty string"
        elif len(title.strip()) > 200:
            errors["title"] = "Title must be at most 200 characters"
        else:
            cleaned["title"] = title.strip()

    if "body" in data:
        body = data.get("body")
        if body is None:
            cleaned["body"] = ""
        elif not isinstance(body, str):
            errors["body"] = "Body must be a string"
        elif len(body) > 20000:
            errors["body"] = "Body must be at most 20000 characters"
        else:
            cleaned["body"] = body

    if "tags" in data:
        tags = data.get("tags")
        if tags is None:
            cleaned["tags"] = []
        elif not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
            errors["tags"] = "Tags must be an array of strings"
        elif len(tags) > 20:
            errors["tags"] = "At most 20 tags"
        else:
            cleaned["tags"] = tags

    if "pinned" in data:
        pinned = data.get("pinned")
        if not isinstance(pinned, bool):
            errors["pinned"] = "Pinned must be a boolean"
        else:
            cleaned["pinned"] = pinned

    if errors:
        raise APIError(422, "Validation failed", details=errors)
    if partial and not cleaned:
        raise APIError(422, "Validation failed", details={"_body": "Provide at least one of title, body, tags, pinned"})
    return cleaned
