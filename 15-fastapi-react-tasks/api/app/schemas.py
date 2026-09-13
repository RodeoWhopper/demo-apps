from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Status = Literal["todo", "in_progress", "done"]
Priority = Literal["low", "medium", "high"]
Role = Literal["admin", "member"]


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    role: Role
    is_active: bool
    created_at: datetime


class UserAdminOut(UserOut):
    assigned_open_tasks: int = 0


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    name: str
    description: str
    color: str
    task_counts: dict[str, int] = Field(default_factory=dict)


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str
    status: Status
    priority: Priority
    assignee_id: int | None
    assignee: UserBrief | None
    created_by_id: int
    due_date: date | None
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectOut):
    tasks: list[TaskOut] = Field(default_factory=list)


class TaskCreate(BaseModel):
    project_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    status: Status = "todo"
    priority: Priority = "medium"
    assignee_id: int | None = None
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    status: Status | None = None
    priority: Priority | None = None
    assignee_id: int | None = None
    due_date: date | None = None
    project_id: int | None = None


class Health(BaseModel):
    status: str
    db: str
    version: str
    users: int
    tasks: int
