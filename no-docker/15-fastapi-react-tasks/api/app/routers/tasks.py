from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Project, Task, User
from ..schemas import Status, TaskCreate, TaskOut, TaskUpdate
from ..security import CurrentUser

router = APIRouter(prefix="/tasks", tags=["tasks"])

STATUS_ORDER = {"todo": 0, "in_progress": 1, "done": 2}
PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def _get_task(db: Session, task_id: int) -> Task:
    task = db.scalar(select(Task).where(Task.id == task_id).options(selectinload(Task.assignee)))
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def _check_refs(db: Session, project_id: int | None, assignee_id: int | None) -> None:
    if project_id is not None and db.get(Project, project_id) is None:
        raise HTTPException(status_code=422, detail=f"Project {project_id} does not exist")
    if assignee_id is not None:
        assignee = db.get(User, assignee_id)
        if assignee is None or not assignee.is_active:
            raise HTTPException(status_code=422, detail=f"Assignee {assignee_id} does not exist or is inactive")


@router.get("", response_model=list[TaskOut])
def list_tasks(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    project_id: int | None = None,
    status_filter: Annotated[Status | None, Query(alias="status")] = None,
    assignee_id: int | None = None,
    mine: bool = False,
):
    query = select(Task).options(selectinload(Task.assignee))
    if project_id is not None:
        query = query.where(Task.project_id == project_id)
    if status_filter is not None:
        query = query.where(Task.status == status_filter)
    if assignee_id is not None:
        query = query.where(Task.assignee_id == assignee_id)
    if mine:
        query = query.where(Task.assignee_id == user.id)
    tasks = db.scalars(query).all()
    return sorted(tasks, key=lambda t: (STATUS_ORDER[t.status], PRIORITY_ORDER[t.priority], t.id))


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    _check_refs(db, payload.project_id, payload.assignee_id)
    task = Task(**payload.model_dump(), created_by_id=user.id)
    db.add(task)
    db.commit()
    return _get_task(db, task.id)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    return _get_task(db, task_id)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    task = _get_task(db, task_id)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="No fields to update")
    _check_refs(db, changes.get("project_id"), changes.get("assignee_id"))
    for field, value in changes.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return _get_task(db, task.id)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    task = _get_task(db, task_id)
    if user.role != "admin" and task.created_by_id != user.id and task.assignee_id != user.id:
        raise HTTPException(status_code=403, detail="Only the creator, the assignee or an admin can delete a task")
    db.delete(task)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
