# Kılavuz Etkinlik — Directus 11 events directory + static frontend

**Kılavuz Etkinlik** is a fictional city-by-city events guide. Content is managed in **Directus 11** (Postgres 16) and displayed by a build-free static HTML/JS frontend served by nginx. What is unique here compared to the other demos: the data model is *not* code inside the CMS — it is created through Directus' REST API by `scripts/bootstrap.sh` (collections, fields, the m2o relation, public-policy permissions and seed data) and exported as a versioned **schema snapshot** (`snapshot/schema.yaml`) that a fresh deployment can `schema apply`. Directus 11 uses *policies* for access control: the script attaches read permissions to the built-in Public policy so anonymous visitors (and the frontend) can read categories and **only published** events. Auth model: Directus' own admin (`cms-admin`, e-mail/password → JWT via `/auth/login`; the admin UI lives at `/admin`); the first admin is created by Directus from `ADMIN_EMAIL`/`ADMIN_PASSWORD` on the first boot.

## Stack

- Directus 11 (`directus/directus:11`, resolved to 11.17.4 at verification time; Node 22)
- PostgreSQL 16 (`postgres:16-alpine`, internal network only)
- Collections: `categories` (name, slug) and `events` (status published/draft/archived, title, slug, starts_at, ends_at, venue, city, description, category m2o → categories)
- Frontend: static `index.html` + vanilla `app.js` (city/category filter + search), `config.js` holds the API URL; nginx 1.27-alpine
- Bootstrap script: bash wrapper around a Python 3 stdlib script (no extra dependencies)
- Docker Compose

## Ports

| Port | Service | Notes |
|------|---------|-------|
| 8011 | `directus` (→ 8055) | REST API (`/items/*`), admin app (`/admin`), health (`/server/health`) |
| 8111 | `frontend` (nginx) | Static site; the browser calls port 8011 directly (CORS enabled) |
| —    | `database` (Postgres 5432) | Internal compose network only |

## Quick start (local)

Docker-only. From this folder:

```bash
cp .env.example .env            # optional: compose has demo fallbacks for every variable
docker compose up -d            # Directus bootstraps its system tables + admin user on first boot (~15 s)
scripts/bootstrap.sh            # creates collections/relation, public permissions, seeds 3 categories + 8 events (idempotent)
open http://localhost:8111/     # frontend        (admin: http://localhost:8011/admin)
```

## Docker

```bash
docker compose up -d
scripts/bootstrap.sh                    # option A – build the schema via the API, then grant + seed (works on a fresh DB)
# option B – apply the versioned snapshot first, then let the script do permissions + seed only:
docker compose exec directus npx directus schema apply --yes /directus/snapshot/schema.yaml
scripts/bootstrap.sh
scripts/bootstrap.sh --snapshot         # re-export snapshot/schema.yaml after changing the model in the admin UI
docker compose down                     # keep data
docker compose down -v                  # wipe database + uploads
```

Both options were verified and end in the same state; the snapshot contains collections/fields/relations only (no permissions, no data), which is why `bootstrap.sh` is still needed after `schema apply`. Post-deploy checklist for the operator: (1) `docker compose up -d`, (2) wait for `GET :8011/server/health` = 200, (3) run `scripts/bootstrap.sh` (needs `python3` on the host; set `DIRECTUS_URL` if the API is not on `http://localhost:8011`), (4) if the frontend is not served from localhost, edit `frontend/config.js` (`window.API_URL`) and set `PUBLIC_URL` / `CORS_ORIGIN` in `.env`.

## Environment variables

Read from `.env` (copy of `.env.example`); every value has a demo fallback in `docker-compose.yml`.

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `DIRECTUS_KEY` | no | `change-me-demo-key` | Directus `KEY` (legacy instance key) |
| `DIRECTUS_SECRET` | no | `change-me-demo-secret-please-rotate-me` | Directus `SECRET` used to sign tokens — rotate for real use |
| `ADMIN_EMAIL` | no | `admin@kilavuz.dev` | First admin user (created on first boot only) |
| `ADMIN_PASSWORD` | no | `Admin123!` | First admin password (first boot only) |
| `POSTGRES_USER` | no | `directus` | Database user (also `DB_USER`) |
| `POSTGRES_PASSWORD` | no | `change-me-demo-db` | Database password (also `DB_PASSWORD`) |
| `POSTGRES_DB` | no | `directus` | Database name (also `DB_DATABASE`) |
| `PUBLIC_URL` | no | `http://localhost:8011` | Public URL of the API/admin (used for links, OAuth, assets) |
| `CORS_ORIGIN` | no | `*` | Allowed browser origins (`*` or comma-separated list) |
| `DIRECTUS_URL` (script only) | no | `PUBLIC_URL` / `http://localhost:8011` | Where `bootstrap.sh` reaches the API |

Frontend: `frontend/config.js` → `window.API_URL` (default `http://localhost:8011`).

## Default credentials

| Role | Username | Password | Where |
|------|----------|----------|-------|
| Directus administrator | `admin@kilavuz.dev` | `Admin123!` | `/admin` and `POST /auth/login` (created automatically on first boot from env) |

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/server/health` | GET | no | **Health check** — 200 `{"status":"ok"}` |
| `/items/events?filter[status][_eq]=published&fields=*,category.name` | GET | no | Published events with category (used by the frontend); drafts are invisible anonymously |
| `/items/events` | GET | no | Same as above — the Public policy filter applies server-side |
| `/items/categories` | GET | no | Categories |
| `/items/events` | POST/PATCH/DELETE | Bearer token | Writes — 403 anonymously |
| `/items/directus_users` | GET | Bearer token | System collections — 403 anonymously |
| `/auth/login` | POST | no | JSON `{email,password}` → `{data:{access_token,refresh_token}}`; 401 on bad credentials |
| `/admin` | GET | no (SPA) | Directus admin app (login form) |
| `/collections`, `/fields`, `/relations`, `/permissions`, `/policies` | * | admin token | Used by `scripts/bootstrap.sh` |
| Frontend `/` (8111) | GET | no | Events list with city/category filters and search |

## Data / persistence

- `db_data` named volume → Postgres data (collections, items, users, permissions).
- `directus_uploads` named volume → `/directus/uploads` (files uploaded via the admin).
- `directus_extensions` named volume → `/directus/extensions`.
- `./snapshot/schema.yaml` (bind-mounted at `/directus/snapshot`) → versioned data model (collections, fields, relation) exported with `directus schema snapshot`.
- Seed data (3 categories, 8 events: 7 published + 1 draft) is inserted by `scripts/bootstrap.sh` only when the collections are empty.

## Verification performed

Run on macOS with Docker 29 / Compose v5.3 (Directus 11.17.4):

- `cp .env.example .env && docker compose up -d` → `database` and `directus` healthy within ~12 s, `frontend` up.
- `scripts/bootstrap.sh --snapshot` on the fresh database → login OK, created `categories` + `events` + relation, granted Public-policy `categories.read` and `events.read` (status = published), seeded 3 categories + 8 events, anonymous `GET /items/events` → 200 with 7 published events; `directus schema snapshot` wrote `snapshot/schema.yaml`. Second run → nothing created/granted/seeded (idempotent).
- `curl` → `/server/health` 200; `/items/events` 200 (7 rows, all with `category.name`); `/items/events?filter[status][_eq]=published&fields=*,category.name` 200; `/items/categories` 200; `/admin` 200; `/items/directus_users` 403; anonymous `POST /items/events` 403; `filter[status][_eq]=draft` anonymously → 0 rows; `GET /items/categories` with `Origin: http://localhost:8111` → `Access-Control-Allow-Origin: *`. Frontend `:8111/`, `/app.js`, `/config.js` → 200; `node --check frontend/app.js` passes.
- Login flow: `POST /auth/login` with the admin credentials → access token; wrong password → 401.
- Alternative deploy path: `docker compose down -v` → `up -d` → `npx directus schema apply --yes /directus/snapshot/schema.yaml` ("Snapshot applied successfully") → `scripts/bootstrap.sh` reported both collections as existing, granted permissions and seeded data; a fresh `schema snapshot` afterwards was byte-identical (ignoring the version line) to the committed one.
- `docker compose down -v` afterwards.
- NOT verified: rendering of the frontend in a real browser (curl + syntax check only), file uploads, running under a non-localhost domain (`PUBLIC_URL`/`CORS_ORIGIN`/`config.js` change — reasoned from configuration), Directus flows/websockets (disabled).
