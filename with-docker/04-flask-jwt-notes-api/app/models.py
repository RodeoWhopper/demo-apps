from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False, default="")
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user")  # "user" | "admin"
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    notes = db.relationship("Note", back_populates="owner", cascade="all, delete-orphan", lazy="dynamic")

    def set_password(self, raw: str) -> None:
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw: str) -> bool:
        return check_password_hash(self.password_hash, raw)

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    def to_dict(self, include_stats: bool = False) -> dict:
        data = {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "created_at": iso(self.created_at),
        }
        if include_stats:
            data["note_count"] = self.notes.count()
        return data


class Note(db.Model):
    __tablename__ = "notes"

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False, default="")
    # Tags are stored as a comma-delimited string wrapped in commas (",a,b,") so LIKE ",tag," is exact.
    tags_csv = db.Column(db.String(500), nullable=False, default=",")
    pinned = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    owner = db.relationship("User", back_populates="notes")

    @property
    def tags(self) -> list[str]:
        return [t for t in self.tags_csv.split(",") if t]

    @tags.setter
    def tags(self, values: list[str]) -> None:
        cleaned = []
        for v in values:
            tag = str(v).strip().lower()
            if tag and tag not in cleaned:
                cleaned.append(tag)
        self.tags_csv = "," + ",".join(cleaned) + "," if cleaned else ","

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "title": self.title,
            "body": self.body,
            "tags": self.tags,
            "pinned": self.pinned,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
