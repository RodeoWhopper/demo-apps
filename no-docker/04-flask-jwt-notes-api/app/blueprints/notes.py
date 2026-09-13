from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_

from ..auth_utils import require_auth
from ..errors import APIError
from ..extensions import db
from ..models import Note
from ..validation import json_body, validate_note_fields

bp = Blueprint("notes", __name__, url_prefix="/notes")


def _own_note_or_404(note_id: int) -> Note:
    note = db.session.get(Note, note_id)
    if note is None:
        raise APIError(404, f"Note {note_id} not found")
    if note.owner_id != g.current_user.id:
        # Owner-only: other users' notes are indistinguishable from missing ones.
        raise APIError(404, f"Note {note_id} not found")
    return note


@bp.get("")
@require_auth()
def list_notes():
    query = Note.query.filter_by(owner_id=g.current_user.id)

    tag = request.args.get("tag", "").strip().lower()
    if tag:
        query = query.filter(Note.tags_csv.like(f"%,{tag},%"))

    q = request.args.get("q", "").strip()
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Note.title.ilike(like), Note.body.ilike(like)))

    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = min(100, max(1, int(request.args.get("per_page", 20))))
    except ValueError:
        raise APIError(400, "page and per_page must be integers")

    query = query.order_by(Note.pinned.desc(), Note.updated_at.desc())
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "items": [n.to_dict() for n in items],
        "page": page,
        "per_page": per_page,
        "total": total,
        "filters": {"tag": tag or None, "q": q or None},
    })


@bp.post("")
@require_auth()
def create_note():
    fields = validate_note_fields(json_body())
    note = Note(owner_id=g.current_user.id, title=fields["title"], body=fields.get("body", ""),
                pinned=fields.get("pinned", False))
    note.tags = fields.get("tags", [])
    db.session.add(note)
    db.session.commit()
    return jsonify(note.to_dict()), 201


@bp.get("/<int:note_id>")
@require_auth()
def get_note(note_id: int):
    return jsonify(_own_note_or_404(note_id).to_dict())


@bp.patch("/<int:note_id>")
@require_auth()
def update_note(note_id: int):
    note = _own_note_or_404(note_id)
    fields = validate_note_fields(json_body(), partial=True)
    if "title" in fields:
        note.title = fields["title"]
    if "body" in fields:
        note.body = fields["body"]
    if "tags" in fields:
        note.tags = fields["tags"]
    if "pinned" in fields:
        note.pinned = fields["pinned"]
    db.session.commit()
    return jsonify(note.to_dict())


@bp.delete("/<int:note_id>")
@require_auth()
def delete_note(note_id: int):
    note = _own_note_or_404(note_id)
    db.session.delete(note)
    db.session.commit()
    return "", 204
