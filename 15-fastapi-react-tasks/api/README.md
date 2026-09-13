# Orbit Tasks API (`api/`)

FastAPI + SQLAlchemy 2 + SQLite service for the Orbit Tasks board. Auth is the OAuth2 password flow (`POST /auth/token`, form-urlencoded `username` + `password`) returning a Bearer JWT (HS256, `JWT_SECRET`). See the root README for the full route table, credentials and verification.

- Port: **8015**. Health: `GET /healthz`. Docs: `GET /docs`.
- Run locally: `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn app.main:app --port 8015`
- Docker: `docker build -t orbit-api . && docker run -p 8015:8015 -v orbit-api-data:/app/data -e JWT_SECRET=... orbit-api`
- Env: `JWT_SECRET`, `ACCESS_TOKEN_MINUTES`, `DATABASE_URL`, `CORS_ORIGINS`, `AUTO_SEED`, `PORT` (see `.env.example`).
- Data: SQLite at `data/orbit.db` (or `/app/data/orbit.db` in Docker); tables + demo seed are created automatically on first start.
- Demo users: `admin@orbit.dev / Admin123!` (admin), `dev@orbit.dev / Dev123!` (member).

Layout: `app/main.py` (app + lifespan seed + CORS), `app/security.py` (bcrypt + JWT + `get_current_user`/`require_admin`), `app/routers/{auth,projects,tasks,admin}.py`, `app/models.py`, `app/schemas.py`, `app/seed.py`.
