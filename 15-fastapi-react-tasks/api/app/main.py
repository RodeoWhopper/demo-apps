"""Orbit Tasks API - FastAPI + SQLAlchemy 2 + SQLite with OAuth2 password-flow JWTs."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, text

from . import config
from .database import Base, SessionLocal, engine
from .models import Task, User
from .routers import admin, auth, projects, tasks
from .schemas import Health


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if config.AUTO_SEED:
        with SessionLocal() as db:
            if db.scalar(select(func.count(User.id))) == 0:
                from .seed import seed

                seed(db)
    yield


app = FastAPI(
    title=config.APP_NAME,
    version=config.VERSION,
    description=(
        "Team task board API. Authenticate with the OAuth2 password flow: POST form-urlencoded "
        "`username` + `password` to `/auth/token`, then send `Authorization: Bearer <access_token>`.\n\n"
        "Demo accounts: `admin@orbit.dev / Admin123!` (admin), `dev@orbit.dev / Dev123!` (member)."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(admin.router)


@app.get("/healthz", response_model=Health, tags=["system"])
def healthz():
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
            return Health(
                status="ok",
                db="ok",
                version=config.VERSION,
                users=db.scalar(select(func.count(User.id))) or 0,
                tasks=db.scalar(select(func.count(Task.id))) or 0,
            )
    except Exception as exc:  # pragma: no cover
        return JSONResponse(status_code=503, content={"status": "error", "db": str(exc)})


@app.get("/", include_in_schema=False)
def root():
    return {"name": config.APP_NAME, "version": config.VERSION, "docs": "/docs", "healthz": "/healthz"}
