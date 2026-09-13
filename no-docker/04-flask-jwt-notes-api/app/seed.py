"""Idempotent demo data for Scribble API."""
from sqlalchemy.exc import IntegrityError

from .extensions import db
from .models import Note, User

DEMO_NOTES = [
    ("Welcome to Scribble", "Your notes live here. Use tags to organise, `?q=` to search, and PATCH to edit.", ["welcome", "howto"], True),
    ("Grocery list", "- oat milk\n- coffee beans\n- lemons\n- rye bread", ["personal", "shopping"], False),
    ("Sprint retro takeaways", "Keep: pairing on tricky bugs. Drop: Friday deploys. Try: async stand-ups.", ["work", "retro"], False),
    ("Book: The Design of Everyday Things", "Affordances vs signifiers. The door that needs a sign has failed.", ["reading", "design"], False),
    ("JWT cheat sheet", "Access tokens are short-lived (15 min); refresh tokens (7 days) mint new pairs via POST /auth/refresh.", ["howto", "work"], True),
    ("Weekend hike ideas", "Ridge trail (12 km), lake loop (7 km, dogs ok), old quarry path (bring lights).", ["personal", "outdoors"], False),
]


def _upsert_user(email: str, name: str, password: str, role: str) -> User:
    user = User.query.filter_by(email=email).first()
    if user is None:
        user = User(email=email, name=name, role=role)
        db.session.add(user)
    user.name = name
    user.role = role
    user.set_password(password)  # keep documented demo credentials working
    return user


def seed_demo(verbose: bool = True) -> dict:
    created = 0
    try:
        admin = _upsert_user("admin@scribble.dev", "Scribble Admin", "Admin123!", "admin")
        demo = _upsert_user("demo@scribble.dev", "Demo User", "Demo123!", "user")
        db.session.flush()

        if demo.notes.count() == 0:
            for title, body, tags, pinned in DEMO_NOTES:
                note = Note(owner=demo, title=title, body=body, pinned=pinned)
                note.tags = tags
                db.session.add(note)
                created += 1
        if admin.notes.count() == 0:
            note = Note(owner=admin, title="Admin scratchpad", body="Check GET /admin/stats for usage numbers.", pinned=False)
            note.tags = ["admin"]
            db.session.add(note)
            created += 1
        db.session.commit()
    except IntegrityError:
        # Another gunicorn worker seeded at the same moment; that is fine.
        db.session.rollback()
        created = 0

    summary = {"users": User.query.count(), "notes": Note.query.count(), "notes_created": created}
    if verbose:
        print(f"Seeded: {summary['users']} users, {summary['notes']} notes ({created} created now)")
    return summary
