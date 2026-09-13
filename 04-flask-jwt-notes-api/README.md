# Scribble API — Flask JSON notes API with Bearer JWT

Scribble API is a pure JSON REST API for personal notes (create, list with tag/text filters, patch, delete) with a small embedded docs UI. What makes it distinctive in this collection is the auth model: **stateless Bearer JWTs** — `POST /auth/login` returns a short-lived access token (15 min) and a long-lived refresh token (7 days), both HS256-signed with `JWT_SECRET`; protected routes read `Authorization: Bearer <token>`, and admin routes are gated by the `role` claim inside the token (403 for regular users). There are no cookies, sessions or CSRF. All errors are structured JSON (`{"error": {"code", "message", "details"}}`), CORS is open, and `GET /docs` serves Swagger UI driven by a hand-written `openapi.yaml`.

## Stack

- Python 3.12 (Docker image `python:3.12-slim`); verified locally on Python 3.14
- Flask 3.1.3 (application factory + blueprints `auth`, `notes`, `admin`)
- Flask-SQLAlchemy 3.1.1 / SQLAlchemy 2.0.52 on SQLite
- PyJWT 2.13.0 (HS256 access + refresh tokens)
- flask-cors 6.0.5
- Gunicorn 26.2.0
- Swagger UI (`swagger-ui-dist@5.17.14` from jsDelivr, loaded by the browser on `/docs` only)
- Password hashing via Werkzeug (`scrypt`)

## Ports

| Port | Purpose |
|------|---------|
| 5004 | HTTP API + docs |

## Quick start (local)

```bash
cd 04-flask-jwt-notes-api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export JWT_SECRET=change-me-demo-jwt-secret
flask --app app seed                     # optional: tables + demo data are also created automatically at startup
gunicorn -b 0.0.0.0:5004 --workers 2 "app:create_app()"
# or for development: flask --app app run --port 5004 --debug
```

Then open http://localhost:5004/docs. Example session:

```bash
TOKEN=$(curl -s -H 'Content-Type: application/json' \
  -d '{"email":"demo@scribble.dev","password":"Demo123!"}' http://localhost:5004/auth/login | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
curl -H "Authorization: Bearer $TOKEN" 'http://localhost:5004/notes?tag=howto'
curl -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Hello","body":"first note","tags":["demo"]}' http://localhost:5004/notes
```

## Docker

```bash
docker build -t scribble-api .
docker run -d --name scribble-api -p 5004:5004 \
  -e JWT_SECRET=change-me-demo-jwt-secret \
  -v scribble-data:/app/data \
  scribble-api
```

The container runs `gunicorn -b 0.0.0.0:$PORT --workers $GUNICORN_WORKERS "app:create_app()"`; tables and demo data are created inside `create_app()` on first start (safe with several workers booting at once). `VOLUME /app/data` holds the SQLite file; a `HEALTHCHECK` polls `/healthz`.

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `JWT_SECRET` | yes (prod) | `change-me-demo-jwt-secret` | HS256 secret for access and refresh tokens |
| `SECRET_KEY` | no | `change-me-demo-flask-secret` | Flask secret key (Flask internals only) |
| `JWT_ACCESS_MINUTES` | no | `15` | Access token lifetime |
| `JWT_REFRESH_DAYS` | no | `7` | Refresh token lifetime |
| `DATABASE_PATH` | no | `data/scribble.db` | SQLite path, absolute or relative to the project root (parent dir auto-created). Docker image sets `/app/data/scribble.db` |
| `AUTO_SEED` | no | `1` | Seed demo users/notes at startup when the `users` table is empty |
| `CORS_ORIGINS` | no | `*` | Allowed origins (`*` or comma-separated) |
| `PORT` | no | `5004` | Bind port (Docker CMD only) |
| `GUNICORN_WORKERS` | no | `2` | Worker count (Docker CMD only) |

See `.env.example`.

## Default credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| admin | `admin@scribble.dev` | `Admin123!` | JWT carries `role: admin`; can call `/admin/*` |
| user | `demo@scribble.dev` | `Demo123!` | Owns 6 seeded notes |

Both are (re)created by the seed (`flask --app app seed` or automatically at first start); passwords are reset on each seed run.

## Routes

| Path | Method | Auth required? | Description |
|------|--------|----------------|-------------|
| `/healthz` | GET | no | `{"status":"ok","db":"ok","users":N,"notes":N,"version":...}` (503 if DB fails) |
| `/` | GET | no | 302 redirect to `/docs` |
| `/docs` | GET | no | Swagger UI (HTML) |
| `/openapi.yaml` | GET | no | OpenAPI 3.1 spec (`application/yaml`) with `bearerAuth` security scheme |
| `/auth/register` | POST | no | `{email, password(>=8), name?}` → 201 `{user, access_token, refresh_token, ...}`; 409 if email taken |
| `/auth/login` | POST | no | `{email, password}` → `{user, access_token, expires_in, refresh_token, refresh_expires_in, token_type}`; 401 on bad credentials |
| `/auth/refresh` | POST | no (refresh token in body) | `{refresh_token}` → new token pair; 401 if expired/invalid/wrong type |
| `/auth/me` | GET | Bearer | Current user + selected claims |
| `/notes` | GET | Bearer | Own notes; filters `?tag=`, `?q=` (title/body substring), `?page=&per_page=`; pinned first |
| `/notes` | POST | Bearer | `{title, body?, tags?[], pinned?}` → 201; 422 with field details on validation errors |
| `/notes/<id>` | GET | Bearer (owner) | One note; 404 if missing or not yours |
| `/notes/<id>` | PATCH | Bearer (owner) | Partial update of title/body/tags/pinned |
| `/notes/<id>` | DELETE | Bearer (owner) | 204 |
| `/admin/users` | GET | Bearer + `role=admin` | All users with note counts (403 for non-admins) |
| `/admin/users/<id>` | DELETE | Bearer + `role=admin` | Delete a user and their notes (400 when deleting yourself) |
| `/admin/stats` | GET | Bearer + `role=admin` | Totals, notes per user, top tags |

Error shape for 400/401/403/404/405/409/422/500: `{"error": {"code": "...", "message": "...", "details": {...}?}}`. 401 responses include `WWW-Authenticate: Bearer realm="scribble"`.

## Data / persistence

- SQLite file at `data/scribble.db` (`DATABASE_PATH`); in Docker `/app/data/scribble.db` on the `/app/data` volume.
- Schema is created with `db.create_all()` inside `create_app()`; no migrations (demo scope).
- Seed (`app/seed.py`) is idempotent: upserts the two users by email (resetting passwords) and creates 6 notes for `demo@` + 1 for `admin@` only when they have none. It runs automatically when the `users` table is empty (`AUTO_SEED=1`) or via `flask --app app seed`.
- Tags are stored as a delimited string column and exposed as a JSON array.

## Verification performed

Run on macOS with Python 3.14.6 in a venv (all packages install and run on 3.14; the Docker image pins Python 3.12):

- `pip install -r requirements.txt`; `flask --app app seed` on a fresh DB (auto-seed created 7 notes, CLI seed then reported 0 new — idempotent); `flask --app app routes` lists 17 rules.
- `gunicorn -b 127.0.0.1:5004 --workers 2 "app:create_app()"` and curl:
  - `GET /healthz` → 200 JSON; `GET /` → 302 to `/docs`; `GET /docs` → 200 HTML referencing `swagger-ui-dist@5.17.14`; `GET /openapi.yaml` → 200 `application/yaml` (the two CDN asset URLs were also fetched → 200).
  - CORS preflight `OPTIONS /notes` with `Origin` → `Access-Control-Allow-Origin/Headers/Methods` present.
  - `POST /auth/login` as demo → 200 with `access_token`, `refresh_token`, `expires_in: 900`; wrong password → 401; missing field → 422 with details; non-JSON body → 400.
  - `GET /auth/me` → 200; `GET /notes` without token → 401 + `WWW-Authenticate`; garbage token → 401.
  - `GET /notes` → 6 notes; `?tag=howto` → 2; `?q=coffee` → 1.
  - `POST /notes` → 201 (tags normalised/deduplicated); invalid body → 422; `PATCH /notes/<id>` → 200; empty PATCH → 422; `GET /notes/<id>` → 200; `/notes/9999` → 404; `DELETE /notes/<id>` → 204.
  - `GET /admin/stats` and `/admin/users` as demo → 403; as admin → 200. Admin reading another user's note by id → 404 (owner-only).
  - `POST /auth/register` → 201, duplicate → 409; `POST /auth/refresh` with the refresh token → new pair; with an access token → 401 `wrong_token_type`.
  - `DELETE /admin/users/<self>` → 400; deleting the registered user → 200.
  - Unknown route → 404 JSON; `PUT /healthz` → 405 JSON.
- Docker: `docker build` then five fresh starts with `GUNICORN_WORKERS=4` on an empty volume → all healthy (this exposed and fixed a concurrent `create_all` race); in the container `/healthz`, `/docs`, `/openapi.yaml`, login, `/notes` and `/admin/stats` → 200; `docker restart` on the existing volume → healthy; no errors in logs. Container, volume and image removed afterwards.
- NOT verified: Swagger UI rendering in a real browser (curl only), token expiry after 15 minutes (only the wrong-type path was exercised), behaviour behind an HTTPS reverse proxy.
