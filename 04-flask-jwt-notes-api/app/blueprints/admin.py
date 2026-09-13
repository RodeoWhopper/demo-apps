from collections import Counter

from flask import Blueprint, g, jsonify
from sqlalchemy import func

from ..auth_utils import require_auth
from ..errors import APIError
from ..extensions import db
from ..models import Note, User

bp = Blueprint("admin", __name__, url_prefix="/admin")


@bp.get("/users")
@require_auth(role="admin")
def list_users():
    users = User.query.order_by(User.id).all()
    return jsonify({"items": [u.to_dict(include_stats=True) for u in users], "total": len(users)})


@bp.delete("/users/<int:user_id>")
@require_auth(role="admin")
def delete_user(user_id: int):
    user = db.session.get(User, user_id)
    if user is None:
        raise APIError(404, f"User {user_id} not found")
    if user.id == g.current_user.id:
        raise APIError(400, "You cannot delete your own account", "self_delete")
    deleted_notes = user.notes.count()
    db.session.delete(user)  # notes cascade
    db.session.commit()
    return jsonify({"deleted": True, "user_id": user_id, "deleted_notes": deleted_notes})


@bp.get("/stats")
@require_auth(role="admin")
def stats():
    total_users = db.session.scalar(db.select(func.count(User.id)))
    total_notes = db.session.scalar(db.select(func.count(Note.id)))
    admins = db.session.scalar(db.select(func.count(User.id)).where(User.role == "admin"))
    pinned = db.session.scalar(db.select(func.count(Note.id)).where(Note.pinned.is_(True)))

    per_user_rows = db.session.execute(
        db.select(User.email, func.count(Note.id)).outerjoin(Note).group_by(User.id).order_by(func.count(Note.id).desc())
    ).all()

    tag_counter = Counter()
    for (tags_csv,) in db.session.execute(db.select(Note.tags_csv)).all():
        tag_counter.update(t for t in tags_csv.split(",") if t)

    return jsonify({
        "users": {"total": total_users, "admins": admins},
        "notes": {"total": total_notes, "pinned": pinned},
        "notes_per_user": [{"email": e, "notes": c} for e, c in per_user_rows],
        "top_tags": [{"tag": t, "count": c} for t, c in tag_counter.most_common(10)],
    })
