# Tarla Journal — Strapi 5 headless CMS + static frontend

**Tarla Journal** is a fictional seasonal-food magazine. The content lives in a **Strapi 5** headless CMS (TypeScript, SQLite) and is consumed by a completely decoupled, build-free **static HTML/JS frontend** served by nginx. What makes this app unique among the demos: it is two independently deployable services talking over a public REST API — the CMS runs on port 1337 and exposes `/api/*` to anonymous readers (public-role permissions and seed data are created **programmatically** in `src/index.ts` on first boot, so there is nothing to click), while the frontend on port 8009 is plain files whose only configuration is the API URL in `frontend/config.js`. Editorial auth is Strapi's own admin panel (`/admin`, JWT-based); the public API needs no credentials. Strapi 5 cannot create the first administrator from environment variables, so `scripts/create-admin.sh` does it via the CLI.

## Stack

- Strapi 5.53.0 (`@strapi/strapi`, `@strapi/plugin-users-permissions`), TypeScript 5, Node 22 (Docker) / Node 20–26 (local)
- SQLite via `better-sqlite3` 12.8 (file `cms/.tmp/data.db`); Postgres/MySQL supported through `cms/config/database.ts`
- Content types: `article` (title, slug uid, excerpt, body **blocks** rich text, publishedDate, optional cover media, category m2o, author m2o), `category` (name, slug), `author` (name, bio)
- Frontend: static `index.html` + `article.html` + vanilla JS (`app.js`, includes a tiny Strapi-blocks → HTML renderer), no framework, no build
- nginx 1.27-alpine (frontend image), node:22-alpine (CMS image), Docker Compose

## Ports

| Port | Service | Notes |
|------|---------|-------|
| 1337 | `cms` (Strapi) | REST API `/api/*`, admin panel `/admin`, health `/_health` |
| 8009 | `frontend` (nginx) | Static site; the browser calls port 1337 directly (CORS enabled) |

## Quick start (local)

```bash
# CMS
cd cms
cp .env.example .env               # demo secrets; regenerate for real use (see file header)
npm ci
npm run build                      # compiles TS + builds the admin panel (~40 s)
npm run start                      # http://localhost:1337  (or `npm run develop` for hot reload + content-type builder)
# first boot: public permissions granted + 2 categories, 2 authors, 5 articles seeded automatically

# first admin user (in another shell, once)
cd .. && scripts/create-admin.sh   # admin@tarla.dev / Admin123!

# Frontend – any static file server works
cd frontend && python3 -m http.server 8009    # http://localhost:8009
```

## Docker

```bash
docker compose build               # builds tarla-journal-cms:local (compiles better-sqlite3 on alpine, several minutes) and the nginx frontend
docker compose up -d               # cms on :1337, frontend on :8009
scripts/create-admin.sh --docker   # create the first admin inside the running cms container (idempotent)
docker compose logs -f cms
docker compose down                # keep the SQLite DB + uploads (named volumes)
docker compose down -v             # wipe everything
```

Post-deploy checklist for the operator: (1) `docker compose up -d`, (2) wait for `GET :1337/_health` → 204, (3) run `scripts/create-admin.sh --docker` **or** open `/admin` once and complete the "create first administrator" form, (4) if the frontend is served from a different host than `http://localhost:1337`, edit `frontend/config.js` (`window.API_URL`) and rebuild/redeploy the frontend, and set `CORS_ORIGIN` in `cms/.env` to that origin.

## Environment variables

Read by the CMS from `cms/.env` (copy of `cms/.env.example`) when running locally. With Docker Compose the secrets come from the root `.env` (copy of the root `.env.example`, interpolated into the `cms` service); `docker-compose.yml` also provides demo fallbacks for every secret, so the stack starts without any `.env`.

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `HOST` | no | `0.0.0.0` | Bind address |
| `PORT` | no | `1337` | HTTP port |
| `APP_KEYS` | yes | demo keys | Comma-separated session keys (`openssl rand -base64 32`) |
| `API_TOKEN_SALT` | yes | demo | Salt for API tokens |
| `ADMIN_JWT_SECRET` | yes | demo | Secret signing admin-panel JWTs |
| `TRANSFER_TOKEN_SALT` | yes | demo | Salt for data-transfer tokens |
| `JWT_SECRET` | yes | demo | Secret for users-permissions JWTs |
| `ENCRYPTION_KEY` | yes | demo | Key for encrypted settings |
| `DATABASE_CLIENT` | no | `sqlite` | `sqlite` \| `postgres` \| `mysql` |
| `DATABASE_FILENAME` | no | `.tmp/data.db` | SQLite file path (relative to `cms/`) |
| `DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD/SSL` | no | — | Only for postgres/mysql |
| `CORS_ORIGIN` | no | `*` | Comma-separated browser origins allowed to call the API |
| `NODE_ENV` | no | `production` (Docker) | Strapi environment |

Frontend: `frontend/config.js` → `window.API_URL` (default `http://localhost:1337`). It is a file, not an env var, because the page is static.

## Default credentials

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Strapi super admin | `admin@tarla.dev` | `Admin123!` | **Not pre-created** — run `scripts/create-admin.sh` (local) or `scripts/create-admin.sh --docker`; alternatively the first visit to `/admin` shows the registration form |

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/_health` | GET | no | **Health check** — 204 No Content |
| `/api/articles?populate=*` | GET | no | Published articles with category, author, cover (public role) |
| `/api/articles?filters[slug][$eq]={slug}&populate=*` | GET | no | Single article by slug (used by `article.html`) |
| `/api/articles/{documentId}` | GET | no | Single article by document id |
| `/api/categories`, `/api/authors` | GET | no | Lookup collections |
| `/api/articles` | POST/PUT/DELETE | API token / admin | Writes are **not** granted to the public role (403) |
| `/api/upload/files` | GET | admin/token | Upload plugin — 403 anonymously |
| `/admin` | GET | no (SPA) | Admin panel; login form at `/admin/login` |
| `/admin/login` | POST | no | JSON `{email,password}` → `{data:{token}}`; 400 on bad credentials |
| Frontend `/` (8009) | GET | no | Article list with category chips |
| Frontend `/article.html?slug=…` (8009) | GET | no | Article detail |

## Data / persistence

- SQLite database `cms/.tmp/data.db` (Docker: named volume `cms_data` mounted at `/opt/app/.tmp`). Created and seeded on first start if there are no articles.
- Media uploads: `cms/public/uploads` (Docker: named volume `cms_uploads`).
- Content-type schemas are code (`cms/src/api/*/content-types/*/schema.json`); the public-role permissions are (re)applied idempotently on every boot.
- The frontend is stateless.

## Verification performed

Run on macOS (Node 26.5, npm 11, Docker 29 / Compose v5.3):

- `npx create-strapi@latest cms --no-run --ts --use-npm --no-example --no-git-init --skip-cloud --skip-db --install --non-interactive` → Strapi 5.53.0 scaffold; content types, bootstrap and config added by hand.
- `cd cms && cp .env.example .env && npm run build` → TS compiled, admin panel built (34 s). `npm run start` → log shows `granted public permission …` ×6 and `seeded 2 categories, 2 authors, 5 articles`.
- `curl :1337/_health` → 204. `curl ':1337/api/articles?populate=*'` → 200, 5 articles with populated `category`, `author`, `body` blocks. Slug filter → 200; `/api/categories`, `/api/authors`, `/admin`, `/admin/login` → 200; unknown id → 404; `/api/upload/files` → 403.
- `scripts/create-admin.sh` → "Admin user created"; second run → "already exists" (idempotent). `POST /admin/login` with the credentials → JWT token; wrong password → 400.
- Frontend served with `python3 -m http.server 8009`: `/`, `/article.html?slug=x`, `/app.js`, `/config.js`, `/styles.css` → 200. CORS preflight from origin `http://localhost:8009` → 204 with `Access-Control-Allow-Origin: http://localhost:8009`. Opened `http://localhost:8009/` and an article page in a browser: list of 5 cards with category chips and the full article body (headings, list, quote) rendered from the API.
- Docker: `docker compose build` → `tarla-journal-cms:local` (2.7 GB, includes build tools) and `tarla-journal-frontend:local` built; `docker compose up -d` → both containers reached `healthy`; `/_health` → 204, `/api/articles?populate=*` → 200 with 5 seeded articles, `/admin` → 200, frontend `:8009/` and `/article.html?slug=x` → 200; `scripts/create-admin.sh --docker` created the admin (second run: already exists) and `POST /admin/login` returned a token; `docker compose down -v` afterwards.
- NOT verified: Postgres/MySQL database clients, media upload through the admin UI, running under a non-localhost domain (CORS_ORIGIN + config.js change) — reasoned from configuration only.
