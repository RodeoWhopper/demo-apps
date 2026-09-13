from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Project, Task
from ..schemas import ProjectDetail, ProjectOut
from ..security import CurrentUser

router = APIRouter(prefix="/projects", tags=["projects"])


def _counts(db: Session, project_id: int) -> dict[str, int]:
    rows = db.execute(
        select(Task.status, func.count(Task.id)).where(Task.project_id == project_id).group_by(Task.status)
    ).all()
    counts = {"todo": 0, "in_progress": 0, "done": 0}
    for status_value, count in rows:
        counts[status_value] = count
    counts["total"] = sum(counts.values())
    return counts


@router.get("", response_model=list[ProjectOut])
def list_projects(user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    projects = db.scalars(select(Project).order_by(Project.id)).all()
    return [ProjectOut(**{c: getattr(p, c) for c in ("id", "key", "name", "description", "color")}, task_counts=_counts(db, p.id)) for p in projects]


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: int, user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    project = db.scalar(
        select(Project).where(Project.id == project_id).options(selectinload(Project.tasks).selectinload(Task.assignee))
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    tasks = sorted(project.tasks, key=lambda t: (t.status, t.id))
    return ProjectDetail(
        **{c: getattr(project, c) for c in ("id", "key", "name", "description", "color")},
        task_counts=_counts(db, project.id),
        tasks=tasks,
    )
