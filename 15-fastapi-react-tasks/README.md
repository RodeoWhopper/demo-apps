# Orbit Tasks — FastAPI API + React SPA monorepo (two services)

Orbit Tasks is a small team task board built as **two independently deployable services** in one repo: `api/` (FastAPI + SQLAlchemy 2 + SQLite, served by uvicorn) and `web/` (React 19 + Vite 6 + TypeScript + React Router 7 + Tailwind 4, served by nginx). It exercises multi-service deployment: the web container's nginx proxies `/api/*` to the API container, so the SPA is built with `VITE_API_URL=/api` and the whole app is reachable from a single public port (5015). Auth is the **OAuth2 password flow** exactly as FastAPI/Swagger expect it — form-urlencoded `username`/`password` to `POST /auth/token` — returning a Bearer JWT that the SPA stores in memory + `localStorage`. Admin-only endpoints check the user's role server-side, and the SPA mirrors that with a protected-route wrapper (redirects to `/login`) and an `/admin` route that renders a 403 page for non-admins. The board updates task status optimistically and rolls back on API errors.

## Stack

- **api/** — Python 3.12 (`python:3.12-slim`; verified locally on 3.14), FastAPI 0.141.1, Starlette 1.6.0, uvicorn 0.52.4, SQLAlchemy 2.0.52, pydantic 2.13.5, PyJWT 2.13.0, bcrypt 5.0.0 (used directly; passlib is not compatible with bcrypt 5), python-multipart 0.0.32
- **web/** — Node 22 (`node:22-alpine` build stage; verified locally on Node 26 / npm 11), React 19.3.0, React DOM 19.3.0, React Router 7.18.3 (library mode, `createBrowserRouter`), Vite 6.4.3, TypeScript 5.9.3, Tailwind CSS 4.3.3 (`@tailwindcss/vite`), `@vitejs/plugin-react` 5.2.0; served by nginx 1.27-alpine
- Docker Compose (v2 file format, no `version:` key)

## Ports

| Port | Service | Purpose |
|------|---------|---------|
| 5015 | web | nginx: SPA + `/api/` reverse proxy to the API + `/healthz` (Vite dev/preview use the same port locally) |
| 8015 | api | uvicorn: JSON API, `/docs`, `/healthz` (exposed for direct access; optional) |

## Quick start (local)

Two processes. Terminal 1 — API:

```bash
cd 15-fastapi-react-tasks/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export JWT_SECRET=change-me-demo-orbit-jwt-secret CORS_ORIGINS=http://localhost:5015
uvicorn app.main:app --host 0.0.0.0 --port 8015      # creates + seeds data/orbit.db on first start
```

Terminal 2 — web:

```bash
cd 15-fastapi-react-tasks/web
npm ci
VITE_API_URL=http://localhost:8015 npm run dev       # http://localhost:5015
# production build + static preview:
VITE_API_URL=http://localhost:8015 npm run build && npm run preview
```

Open http://localhost:5015 and sign in with a demo account (below). API docs: http://localhost:8015/docs.

## Docker

```bash
cd 15-fastapi-react-tasks
docker compose build
docker compose up -d
# SPA:            http://localhost:5015/
# API via proxy:  http://localhost:5015/api/healthz   http://localhost:5015/api/docs
# API direct:     http://localhost:8015/healthz
docker compose down -v          # -v also deletes the SQLite volume
```

`docker-compose.yml` defines `api` (build `./api`, port 8015, named volume `orbit-api-data` at `/app/data`, healthcheck on `/healthz`) and `web` (build `./web` with build arg `VITE_API_URL=/api`, port 5015, `depends_on: api: condition: service_healthy`). Each service also has its own Dockerfile and can be built/run alone (see `api/README.md`, `web/README.md`).

## Environment variables

| Name | Service | Required | Default | Description |
|------|---------|----------|---------|-------------|
| `JWT_SECRET` | api | yes (prod) | `change-me-demo-orbit-jwt-secret` | HS256 secret for access tokens |
| `ACCESS_TOKEN_MINUTES` | api | no | `60` | Access token lifetime |
| `DATABASE_URL` | api | no | `sqlite:///./data/orbit.db` (compose: `sqlite:////app/data/orbit.db`) | SQLAlchemy URL; directory auto-created for SQLite |
| `CORS_ORIGINS` | api | no | `http://localhost:5015` (compose adds `http://127.0.0.1:5015`) | Comma-separated allowed browser origins; irrelevant when using the nginx `/api` proxy |
| `AUTO_SEED` | api | no | `1` | Seed demo data when the users table is empty |
| `PORT` | api | no | `8015` | uvicorn bind port (Docker CMD) |
| `VITE_API_URL` | web (build-time) | no | `http://localhost:8015` in code; `/api` in compose | Base URL baked into the bundle at build time |

See `.env.example` (root, read by compose), `api/.env.example` and `web/.env.example`.

## Default credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| admin | `admin@orbit.dev` | `Admin123!` | Can open `/admin` and call `/admin/*`; can delete any task |
| member | `dev@orbit.dev` | `Dev123!` | Board + projects; `/admin` shows 403; can delete only tasks they created or are assigned to |

Both are (re)created by the automatic seed at API startup; passwords are reset each time the seed runs (only when the users table is empty).

## Routes

SPA (web, port 5015):

| Path | Method | Auth required? | Description |
|------|--------|----------------|-------------|
| `/healthz` | GET | no | nginx JSON health (`{"status":"ok","service":"orbit-web"}`) — use this as the compose healthcheck |
| `/login` | GET | no | Sign-in form (OAuth2 password flow against the API) |
| `/` | GET | yes (redirects to `/login`) | Task board grouped by status with optimistic toggles, create + delete |
| `/projects/:id` | GET | yes | Project detail with progress and its tasks |
| `/admin` | GET | yes + admin role | User list with activate/deactivate; non-admins see a 403 page |
| `/api/*` | any | as API | Reverse proxy to the API container (`/api/` prefix stripped) |
| `*` | GET | yes | 404 page (history fallback serves `index.html` for every path) |

API (port 8015 directly, or `/api/...` through the web container):

| Path | Method | Auth required? | Description |
|------|--------|----------------|-------------|
| `/healthz` | GET | no | `{"status":"ok","db":"ok","version":...,"users":N,"tasks":N}` (503 if DB fails) |
| `/` | GET | no | Service info JSON |
| `/docs`, `/openapi.json` | GET | no | Auto-generated Swagger UI / OpenAPI (with OAuth2 password "Authorize") |
| `/auth/token` | POST (form-urlencoded) | no | `username`, `password` (+ optional `grant_type=password`) → `{access_token, token_type: "bearer", expires_in}`; 401 bad credentials, 403 deactivated |
| `/auth/me` | GET | Bearer | Current user |
| `/projects` | GET | Bearer | Projects with per-status task counts |
| `/projects/{id}` | GET | Bearer | Project + its tasks (404 if missing) |
| `/tasks` | GET | Bearer | Tasks; filters `?project_id=`, `?status=todo|in_progress|done`, `?assignee_id=`, `?mine=true` |
| `/tasks` | POST | Bearer | `{project_id, title, description?, status?, priority?, assignee_id?, due_date?}` → 201; 422 on validation / unknown project or inactive assignee |
| `/tasks/{id}` | GET | Bearer | One task |
| `/tasks/{id}` | PATCH | Bearer | Partial update (422 if empty) |
| `/tasks/{id}` | DELETE | Bearer (creator, assignee or admin) | 204; 403 otherwise |
| `/admin/users` | GET | Bearer + admin | Users with open-task counts (403 for members) |
| `/admin/users/{id}/toggle-active` | POST | Bearer + admin | Flip `is_active`; 400 on self. Deactivated users get 403 on login and on existing tokens |

## Data / persistence

- API: SQLite at `api/data/orbit.db` locally (`DATABASE_URL`), or `/app/data/orbit.db` on the compose named volume `orbit-api-data`. Tables are created with `Base.metadata.create_all` in the FastAPI lifespan; the seed (2 users, 2 projects, 8 tasks) runs when the users table is empty. No migrations (demo scope).
- Web: stateless static files; the JWT is kept in memory and mirrored to the browser's `localStorage` under `orbit.token`.

## Verification performed

Local (macOS, Python 3.14.6, Node 26.5.0 / npm 11.17.0):

- **api**: `pip install -r requirements.txt` in a venv; `uvicorn app.main:app --port 8015` created and seeded the DB. curl: `GET /healthz` → 200; `GET /docs` → 200; OpenAPI shows the `OAuth2PasswordBearer` password flow; `POST /auth/token` form-urlencoded → 200 `{token_type: bearer, expires_in: 3600}`; wrong password → 401; JSON body instead of form → 422; `GET /auth/me` → 200; `GET /tasks` without token → 401 with `WWW-Authenticate: Bearer`; `GET /tasks` → 8; `?status=done&project_id=1` → 1; `?mine=true` → 3; `GET /projects` → 2 with counts; `GET /projects/2` → 4 tasks; `/projects/99` → 404; `POST /tasks` → 201; invalid body → 422; unknown project → 422; `PATCH /tasks/{id}` (status + assignee) → 200; empty PATCH → 422; `GET /admin/users` as member → 403, as admin → 200; toggle-active on self → 400; deactivating the member made their existing token and a fresh login return 403, reactivating restored access; member deleting an admin-created task → 403; deleting own task → 204; CORS preflight from `http://localhost:5015` returns `access-control-allow-origin`, other origins get none.
- **web**: `npm install` (lockfile committed), `npm run build` (`tsc --noEmit && vite build`, 52 modules, ~337 kB JS) with the default `VITE_API_URL=http://localhost:8015` baked in; `npm run preview` on 5015: `/`, `/admin`, `/projects/1`, `/login` all → 200 `text/html` (history fallback), `/orbit.svg` → 200.
- **docker compose**: `docker compose build` and `docker compose up -d` → `orbit-api` healthy, `orbit-web` up. curl: `http://localhost:5015/` → 200 HTML; `/admin` → 200 (fallback); `/healthz` (nginx) → 200; `/api/healthz` (proxied) → 200 JSON; `POST /api/auth/token` → token; `GET /api/tasks` with Bearer → 200; `/api/docs` → 200; direct `http://localhost:8015/healthz` → 200; the built bundle contains `"/api"` as its base URL.
- **browser (compose stack)**: visiting `/` while signed out redirected to `/login`; signing in as `dev@orbit.dev` rendered the board with the 8 seeded tasks (data fetched through `/api`); clicking "Move to In progress" moved the card instantly and the API confirmed the new status afterwards; navigating to `/admin` as a member rendered the 403 page and the session survived the full page reload (localStorage token).
- Cleanup: `docker compose down -v` (containers, network, volume removed) and both images deleted; `.venv`, `node_modules`, `dist`, `__pycache__`, and the SQLite file were removed afterwards.
- NOT verified: the Vite dev server (`npm run dev`) with hot reload against the API (only build + preview were run), token expiry after 60 minutes, the admin page's toggle button in the browser (the same endpoint was verified with curl), deployment behind an external HTTPS reverse proxy.
