"""Idempotent demo data: 2 users, 2 projects, 8 tasks."""
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Project, Task, User
from .security import hash_password


def _upsert_user(db: Session, email: str, name: str, password: str, role: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email)
        db.add(user)
    user.name = name
    user.role = role
    user.is_active = True
    user.password_hash = hash_password(password)  # keep documented demo credentials valid
    return user


def seed(db: Session) -> dict:
    admin = _upsert_user(db, "admin@orbit.dev", "Ada Admin", "Admin123!", "admin")
    dev = _upsert_user(db, "dev@orbit.dev", "Devon Developer", "Dev123!", "member")
    db.flush()

    projects = {}
    for key, name, color, description in [
        ("LAUNCH", "Launch Site", "#7c6cff", "Marketing site and launch checklist for Orbit 1.0."),
        ("MOBILE", "Mobile App", "#2dd4bf", "React Native companion app: offline first, sync later."),
    ]:
        project = db.scalar(select(Project).where(Project.key == key))
        if project is None:
            project = Project(key=key)
            db.add(project)
        project.name, project.color, project.description = name, color, description
        projects[key] = project
    db.flush()

    created = 0
    if db.scalar(select(Task).limit(1)) is None:
        today = date.today()
        tasks = [
            ("LAUNCH", "Write launch announcement", "Blog post + email to waitlist.", "done", "high", admin, 5),
            ("LAUNCH", "Design pricing page", "Three tiers, annual toggle.", "in_progress", "high", dev, 2),
            ("LAUNCH", "Set up status page", "Public uptime page linked from footer.", "todo", "medium", dev, 7),
            ("LAUNCH", "Record product demo video", "90 seconds, no voice-over.", "todo", "low", None, 14),
            ("MOBILE", "Offline task cache", "Persist board state with SQLite on device.", "in_progress", "high", dev, 3),
            ("MOBILE", "Push notifications for due dates", "Local notifications first; server push later.", "todo", "medium", admin, 10),
            ("MOBILE", "App icon and splash screen", "Orbit ring motif on deep navy.", "done", "low", admin, 1),
            ("MOBILE", "Crash reporting", "Evaluate self-hosted options only.", "todo", "medium", None, 21),
        ]
        for key, title, description, status, priority, assignee, due_in in tasks:
            db.add(
                Task(
                    project=projects[key],
                    title=title,
                    description=description,
                    status=status,
                    priority=priority,
                    assignee=assignee,
                    created_by=admin,
                    due_date=today + timedelta(days=due_in),
                )
            )
            created += 1

    db.commit()
    summary = {
        "users": db.scalar(select(User.id).limit(1)) and len(db.scalars(select(User)).all()),
        "projects": len(db.scalars(select(Project)).all()),
        "tasks": len(db.scalars(select(Task)).all()),
        "tasks_created": created,
    }
    print(f"Seeded: {summary['users']} users, {summary['projects']} projects, {summary['tasks']} tasks ({created} created now)")
    return summary
