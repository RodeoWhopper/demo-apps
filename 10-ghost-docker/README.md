# Sığınak — Ghost 5 newsletter/blog on Docker

**Sığınak** ("the shelter") is a fictional Turkish weekly newsletter about cities, walking and slow living, published with **Ghost 5**. Unlike the other demos it is a stock Ghost image plus a MySQL 8 database; the only source-controlled code is a custom Handlebars theme (`siginak`) and a custom `routes.yaml` that adds a `/newsletter/` channel (posts tagged `newsletter`) and an `/archive/` list. Ghost cannot create its owner account from environment variables, so `scripts/setup-owner.sh` bootstraps everything through the **Admin API** (owner account, session login, theme activation, site settings, navigation, sample page + posts) and is safe to re-run. Auth model: Ghost's own admin (`cms-admin`) — a cookie session obtained from `POST /ghost/api/admin/session/`; the public site, RSS and `/ghost/api/admin/site/` need no auth.

## Stack

- Ghost 5 (`ghost:5-alpine`, resolved to Ghost 5.130.6 / Node 22 at verification time)
- MySQL 8.0 (`mysql:8.0`, internal network only)
- Theme `siginak`: Handlebars templates (`default`, `index`, `post`, `page`, `tag`, `author`, `error`, `newsletter`, `archive`, partials), one CSS file, no build step, no external fonts
- Ghost Portal (members/subscribe widget) is injected by `{{ghost_head}}` from Ghost's CDN — standard Ghost behaviour
- Docker Compose

## Ports

| Port | Service | Notes |
|------|---------|-------|
| 8010 | `ghost` (→ 2368 in the container) | The only published port |
| —    | `db` (MySQL 3306) | Internal compose network only |

## Quick start (local)

Docker-only (Ghost + MySQL). From this folder:

```bash
cp .env.example .env         # optional – setup-owner.sh copies it if missing
docker compose up -d
scripts/setup-owner.sh       # creates owner, activates theme, seeds content (idempotent, ~10 s)
open http://localhost:8010/  # admin: http://localhost:8010/ghost/
```

If you skip the script, the first visit to `http://localhost:8010/ghost/` shows Ghost's own setup screen (create the owner there, then activate the theme under Settings → Design).

## Docker

```bash
docker compose up -d            # start MySQL + Ghost (Ghost creates its schema on first boot, ~20 s)
scripts/setup-owner.sh          # REQUIRED once; re-runnable
docker compose logs -f ghost
docker compose down             # keep data
docker compose down -v          # destroy DB + content volume
```

Changing the public URL: set `GHOST_URL` in `.env` (must match what visitors type, e.g. `https://siginak.example.com`) and `docker compose up -d`. Ghost derives all absolute links from it. Put a TLS-terminating proxy in front and forward `X-Forwarded-Proto`.

Theme changes: files under `content/themes/siginak/` are bind-mounted. Ghost runs in production mode and caches templates, so after editing run `docker compose restart ghost` (or re-activate the theme in the admin).

Backups: `docker compose exec db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > backup.sql` and archive the `10-ghost-docker_ghost_content` volume (images, uploads, logs).

## Environment variables

Read from `.env` (copy of `.env.example`); every value has a demo fallback in `docker-compose.yml`.

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `GHOST_URL` | no | `http://localhost:8010` | Public URL of the site (`url` config) |
| `MYSQL_ROOT_PASSWORD` | no | `change-me-demo-root` | MySQL root password (demo) |
| `MYSQL_DATABASE` | no | `ghost` | Database name |
| `MYSQL_USER` | no | `ghost` | Database user used by Ghost |
| `MYSQL_PASSWORD` | no | `change-me-demo-ghost` | Database password (demo) |
| `MAIL_TRANSPORT` | no | `Direct` | Ghost `mail.transport`; use `SMTP` plus `mail__options__*` env for real e-mail |
| `STAFF_DEVICE_VERIFICATION` | no | `false` | Ghost `security.staffDeviceVerification`. Keep `false` unless SMTP works — otherwise every new admin login (including the setup script) fails with an e-mail error |
| `GHOST_OWNER_NAME` | no | `Sığınak Editörü` | Owner display name (setup script) |
| `GHOST_OWNER_EMAIL` | no | `owner@siginak.dev` | Owner e-mail / login (setup script) |
| `GHOST_OWNER_PASSWORD` | no | `Owner123!!` | Owner password, ≥10 characters (setup script) |

## Default credentials

| Role | Username | Password | Where |
|------|----------|----------|-------|
| Owner (administrator) | `owner@siginak.dev` | `Owner123!!` | `/ghost/` (created by `scripts/setup-owner.sh`) |

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/` | GET | no | Home: hero + subscribe form + latest posts (8 per page, `/page/2/`…) |
| `/newsletter/` | GET | no | Channel of posts tagged `newsletter` (custom `routes.yaml`), template `newsletter.hbs`; `/newsletter/rss/` also works |
| `/archive/` | GET | no | Compact list of all posts (custom route, `archive.hbs`) |
| `/{slug}/` | GET | no | Post, e.g. `/sayi-1-yavaslamanin-haritasi/`; pages e.g. `/hakkinda/` |
| `/tag/{slug}/`, `/author/{slug}/` | GET | no | Taxonomies, e.g. `/tag/newsletter/`, `/author/siginak/` |
| `/rss/` | GET | no | RSS feed |
| `/ghost/api/admin/site/` | GET | no | **Health check** — 200 JSON (`title`, `version`, `url`) |
| `/ghost/` | GET | no (SPA) | Admin panel (login form; setup wizard when no owner exists) |
| `/ghost/api/admin/session/` | POST | no | JSON `{username,password}` + `Origin` header → 201 + session cookie; 422 on bad password |
| `/ghost/api/admin/*` (posts, settings, themes…) | * | session cookie | Admin API — 403 without a session |
| `/ghost/api/content/*` | GET | Content API key | Public Content API (create a key under Settings → Integrations) |

## Data / persistence

- `db_data` named volume → MySQL data.
- `ghost_content` named volume → `/var/lib/ghost/content` (images, media, files, logs, Ghost's copy of the default Casper theme).
- Bind mounts from the repo: `content/themes/siginak/` (theme) and `content/settings/routes.yaml` (routing).
- Posts, pages, settings and the owner account live in MySQL and are created by `scripts/setup-owner.sh` only when missing.

## Verification performed

Run on macOS with Docker 29 / Compose v5.3:

- `cp .env.example .env && docker compose up -d` → `db` healthy (TCP `mysqladmin ping`), `ghost` healthy; Ghost 5.130.6 created its schema.
- `scripts/setup-owner.sh` on a fresh database → created owner, session login 201, theme `siginak` activated (Ghost's theme validator reported no errors after fixes), settings/navigation applied (`locale: tr`, accent colour), stock "Coming soon" post deleted, 1 page + 5 posts created (~11 s). Second and third runs → nothing created/deleted (idempotent). Also ran `docker compose down -v` → `up -d` → script again to prove the complete fresh-deploy path.
- `curl` → `/`, `/ghost/api/admin/site/`, `/ghost/`, `/rss/`, `/newsletter/`, `/newsletter/rss/`, `/archive/`, `/hakkinda/`, `/sayi-1-yavaslamanin-haritasi/`, `/sessizligin-mimarisi/`, `/tag/newsletter/`, `/tag/sehir/`, `/author/siginak/`, theme CSS → 200; unknown URL and deleted `/coming-soon/` → 404 rendered by `error.hbs`. Home lists 5 cards, `/newsletter/` 3, `/archive/` 5. `/ghost/api/admin/site/` JSON shows the Turkish title/description/locale.
- Login flow: `POST /ghost/api/admin/session/` with the owner credentials → 201 (cookie); wrong password → 422; `GET /ghost/api/admin/posts/` without session → 403.
- Found and fixed during verification: Ghost's staff device verification e-mails a code on new logins and returns 500 without SMTP → `security__staffDeviceVerification=false` is set by default.
- `docker compose down -v` afterwards.
- NOT verified: rendering in a real browser (curl/HTML inspection only), member sign-up e-mails and newsletter sending (no SMTP), image uploads, running behind an HTTPS proxy. Ghost logs a harmless `IMAGE_SIZE_URL`/`ECONNREFUSED` error when it tries to fetch its own `/favicon.ico` through the public URL from inside the container; pages still render.
