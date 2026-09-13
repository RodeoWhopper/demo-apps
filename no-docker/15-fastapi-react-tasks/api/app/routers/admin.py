from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Task, User
from ..schemas import UserAdminOut
from ..security import AdminUser

router = APIRouter(prefix="/admin", tags=["admin"])


def _to_admin_out(db: Session, user: User) -> UserAdminOut:
    open_tasks = db.scalar(
        select(func.count(Task.id)).where(Task.assignee_id == user.id, Task.status != "done")
    )
    return UserAdminOut.model_validate(user, from_attributes=True).model_copy(update={"assigned_open_tasks": open_tasks or 0})


@router.get("/users", response_model=list[UserAdminOut])
def list_users(admin: AdminUser, db: Annotated[Session, Depends(get_db)]):
    users = db.scalars(select(User).order_by(User.id)).all()
    return [_to_admin_out(db, u) for u in users]


@router.post("/users/{user_id}/toggle-active", response_model=UserAdminOut)
def toggle_active(user_id: int, admin: AdminUser, db: Annotated[Session, Depends(get_db)]):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return _to_admin_out(db, user)
