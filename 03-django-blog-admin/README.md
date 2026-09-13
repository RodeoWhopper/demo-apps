# Pergament — Django long-form blog with admin backoffice

Pergament is a server-rendered, long-form publishing blog: Markdown essays grouped by category, paginated listing, full-text search, an RSS feed, moderated reader comments and an author dashboard. What makes it distinctive in this collection is the auth/routing model: **classic Django session authentication** (CSRF-protected HTML forms, `sessionid` cookie, POST-only logout) and the **built-in Django admin** acting as the CMS-style backoffice, with customised `ModelAdmin`s (list displays, filters, pre-populated slugs, inline comments and bulk actions "Publish selected posts" / "Approve selected comments"). Everything is rendered by Django templates — no JavaScript framework, no external fonts, static assets are served by WhiteNoise from the same process.

## Stack

- Python 3.12 (Docker image `python:3.12-slim`); verified locally on Python 3.14
- Django 5.2.17 (LTS) — `django.contrib.auth`, `django.contrib.admin`, syndication framework
- SQLite (bundled with Python)
- Gunicorn 26.2.0 (WSGI server)
- WhiteNoise 6.12.0 (static files)
- Markdown 3.10.3 (post bodies; `fenced_code`, `tables`, `sane_lists`, `smarty` extensions)
- Plain CSS, system serif fonts, zero runtime network dependencies

## Ports

| Port | Purpose |
|------|---------|
| 8003 | HTTP (gunicorn in Docker / runserver locally) |

## Quick start (local)

```bash
cd 03-django-blog-admin
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DJANGO_DEBUG=1                         # dev mode; omit for production behaviour
python manage.py migrate
python manage.py seed_demo                    # idempotent: users, categories, 8 posts, comments
python manage.py runserver 0.0.0.0:8003
```

Production-style local run (what the container does):

```bash
export DJANGO_SECRET_KEY='a-long-random-string' DJANGO_DEBUG=0 DJANGO_ALLOWED_HOSTS='*'
python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py seed_demo
gunicorn pergament.wsgi:application --bind 0.0.0.0:8003 --workers 2
```

Open http://localhost:8003/ (blog), http://localhost:8003/admin/ (backoffice).

## Docker

```bash
docker build -t pergament .
docker run -d --name pergament -p 8003:8003 \
  -e DJANGO_SECRET_KEY='change-me-demo-secret-pergament' \
  -e DJANGO_ALLOWED_HOSTS='*' \
  -v pergament-data:/app/data \
  pergament
```

`entrypoint.sh` runs `migrate` → `collectstatic` → `seed_demo` (idempotent) → `gunicorn` on `$PORT` (default 8003). The image declares `VOLUME /app/data` for the SQLite database and includes a `HEALTHCHECK` against `/healthz/`.

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | yes (prod) | `change-me-demo-secret-pergament` | Signing key for sessions/CSRF. Use a long random value in production. |
| `DJANGO_DEBUG` | no | `0` | `1`/`true` enables debug mode. |
| `DJANGO_ALLOWED_HOSTS` | no | `*` | Comma-separated allowed `Host` values. |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | no | *(empty)* | Comma-separated origins with scheme (e.g. `https://blog.example.com`). Needed for form POSTs when served over HTTPS behind a proxy. |
| `DJANGO_DB_PATH` | no | `data/db.sqlite3` | SQLite path, absolute or relative to the project root (parent dir auto-created). Docker image sets `/app/data/db.sqlite3`. |
| `PORT` | no | `8003` | Bind port (entrypoint.sh only). |
| `GUNICORN_WORKERS` | no | `2` | Gunicorn worker count (entrypoint.sh only). |

See `.env.example`.

## Default credentials

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Superuser / staff | `admin` | `Admin123!` | Full Django admin access, can edit any post |
| Author (non-staff) | `editor` | `Editor123!` | Can write/edit own posts, use dashboard; **cannot** open `/admin/` |

Both are (re)created by `python manage.py seed_demo`; passwords are reset on every run so the documented credentials always work.

## Routes

| Path | Method | Auth required? | Description |
|------|--------|----------------|-------------|
| `/healthz/` | GET | no | JSON health check: `{"status":"ok","db":"ok","published_posts":N}` (503 if the DB fails) |
| `/` | GET | no | Published posts, newest first, paginated (5/page, `?page=N`) |
| `/post/<slug>/` | GET | no | Post detail (Markdown rendered) + approved comments. Drafts are 404 unless you are the author or staff |
| `/post/<slug>/` | POST | no | Submit a comment (CSRF form) — stored unmoderated until approved in admin |
| `/post/<slug>/edit/` | GET/POST | yes (author or staff, else 403) | Edit a post via ModelForm |
| `/category/<slug>/` | GET | no | Published posts in a category |
| `/search/?q=` | GET | no | Case-insensitive search over title/excerpt/body |
| `/feed/` | GET | no | RSS 2.0 feed of the latest 20 published posts |
| `/accounts/login/` | GET/POST | no | Session login form (`username`, `password`, `csrfmiddlewaretoken`, optional `next`) |
| `/accounts/logout/` | POST | yes | Logs out (POST-only, CSRF) and redirects to `/` |
| `/write/` | GET/POST | yes (redirects to login) | Create a post (title, category, excerpt, Markdown body, draft/published) |
| `/dashboard/` | GET | yes (redirects to login) | Author's own posts with status, comment counts, edit links |
| `/admin/` | GET | staff only (redirects to `/admin/login/`) | Django admin backoffice: Posts (publish/unpublish actions), Comments (approve/hide actions), Categories, Users |
| `/static/...` | GET | no | Static assets via WhiteNoise |

## Data / persistence

- SQLite database at `data/db.sqlite3` (override with `DJANGO_DB_PATH`). In Docker: `/app/data/db.sqlite3` on the `/app/data` volume.
- Schema is created by `python manage.py migrate` (migrations are committed in `blog/migrations/`).
- Demo content comes from `python manage.py seed_demo` — idempotent (`get_or_create` / `update_or_create` by username and slug), so it is safe to run on every start. Seeds 2 users, 3 categories, 8 posts (7 published + 1 draft) and 6 comments (4 approved, 2 pending).
- Collected static files land in `staticfiles/` (gitignored; regenerated by `collectstatic`).

## Verification performed

Run on macOS with Python 3.14.6 in a venv (Django 5.2.17 installs and runs on 3.14; the Docker image pins Python 3.12):

- `pip install -r requirements.txt`, `manage.py makemigrations blog` (migration committed), `manage.py migrate`, `manage.py seed_demo` twice (idempotent, same counts), `manage.py check` → no issues. `check --deploy` shows only the expected HTTPS-hardening warnings (HSTS, secure cookies, demo secret).
- `runserver 127.0.0.1:8003` with `DJANGO_DEBUG=0` and curl:
  - `GET /healthz/` → 200 JSON; `/`, `/?page=2`, `/post/<slug>/`, `/category/craft/`, `/search/?q=margin` (3 hits), `/feed/` (RSS, `application/rss+xml`), `/static/css/pergament.css` (200 via WhiteNoise), `/admin/login/` → 200.
  - Markdown rendering confirmed (a `<table>` appears in the em-dash post).
  - Draft post → 404 anonymously, 200 for its author.
  - `/dashboard/`, `/write/`, `/admin/` anonymously → 302 to the login page.
  - Login flow via curl: GET `/accounts/login/` (csrftoken cookie) → POST username/password/csrfmiddlewaretoken with `Referer` → 302 to `/dashboard/` → GET `/dashboard/` with cookie → 200 ("Hello, Elias"); without cookie → 302.
  - CRUD: POST `/write/` created a published post (302 to its page, then 200 publicly); the author can open `/post/<slug>/edit/` (200) but editing another user's post → 403; non-staff `editor` hitting `/admin/` → 302 to admin login.
  - Anonymous comment POST → 302 back to the post (pending moderation). Admin login via `/admin/login/` → `/admin/` 200; ran the **Approve selected comments** action (3 pending → 0, comment count on the post went 0 → 2) and the **Publish selected posts** action (draft became public, 200).
  - POST `/accounts/logout/` → 302 to `/`, dashboard afterwards → 302.
- Docker: `docker build` and `docker run -p 8003:8003 -v ...:/app/data` → entrypoint ran migrate/collectstatic/seed, gunicorn served `/healthz/`, `/`, a post, `/static/css/pergament.css`, `/admin/login/`, `/feed/` → all 200. Container, volume and image removed afterwards.
- NOT verified: browser rendering (curl only), HTTPS/proxy deployment with `DJANGO_CSRF_TRUSTED_ORIGINS`, multi-worker SQLite contention under load.
