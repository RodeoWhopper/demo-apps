# Depot Ninety – warehouse inventory (Express 4 + EJS)

Depot Ninety is a fictional warehouse's stock-keeping tool: a classic **server-rendered multi-page app**
with HTML forms, redirects and flash messages instead of a JavaScript front end. Items have SKUs, bin
locations, quantities and reorder levels; clerks create and edit them, admins can also delete them and see a
low-stock report. What makes it distinct: authentication is a **server-side session** (`express-session`
with the default in-memory store, `bcryptjs` password hashes, session-id rotation on login), every
state-changing form carries a **hand-rolled CSRF token stored in the session**, routing is split into
**Express `Router` modules** (`routes/auth.js`, `routes/items.js`, `routes/admin.js`), and persistence is a
**lowdb JSON file** that seeds itself on first start. Styling is Tailwind loaded from a CDN at page render time.

## Stack

- Node.js 22 (ESM; developed and verified on Node 26.5)
- Express 4.22.2
- EJS 6.0.1 (views + partials)
- express-session 1.19.0 (MemoryStore)
- lowdb 7.0.1 (`JSONFilePreset`)
- bcryptjs 3.0.3
- Tailwind CSS via `https://cdn.tailwindcss.com` (browser-side, no build step)

## Ports

| Port | Purpose |
| --- | --- |
| 3005 | HTTP (all pages + `/healthz`) |

## Quick start (local)

```bash
cd 05-express-ejs-inventory
cp .env.example .env      # optional; defaults work for a demo
npm ci --omit=dev         # or plain `npm ci` (there are no dev dependencies)
npm start                 # node server.js -> http://localhost:3005
# auto-restart on file changes:
npm run dev
```

There is no build step. `data/inventory.json` is created and seeded on first start.

## Docker

```bash
docker build -t depot-ninety .
docker run --rm -p 3005:3005 \
  -e SESSION_SECRET=change-me-demo-secret-depot \
  -v depot-data:/app/data \
  depot-ninety
curl http://localhost:3005/healthz
```

Single-stage `node:22-alpine` image: `npm ci --omit=dev`, copies the source, runs as the unprivileged `app`
user, sets `PORT=3005`, `HOST=0.0.0.0`, `DATA_DIR=/app/data` and declares `VOLUME /app/data`.

## Environment variables

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `SESSION_SECRET` | no (strongly recommended) | `change-me-demo-secret-depot` | Signs the `depot.sid` session cookie. A warning is logged at startup when unset. |
| `PORT` | no | `3005` | HTTP port. |
| `HOST` | no | `0.0.0.0` | Bind address. |
| `COOKIE_SECURE` | no | `false` | `true` behind HTTPS to add the `Secure` cookie flag. Keep `false` for plain-HTTP smoke tests. |
| `TRUST_PROXY` | no | `false` | `true` behind a reverse proxy (`app.set("trust proxy", 1)`). |
| `DATA_DIR` | no | `./data` (Docker: `/app/data`) | Directory containing `inventory.json`. Must be writable. |
| `NODE_ENV` | no | – | Set `production` in deployments (the Dockerfile does). |

## Default credentials

| Role | Username | Password | Can |
| --- | --- | --- | --- |
| admin | `admin` | `admin123` | everything, incl. delete items and `/admin` |
| clerk | `clerk` | `clerk123` | view, create and edit items |

## Routes

| Path | Method | Auth required? | Description |
| --- | --- | --- | --- |
| `/healthz` | GET | no | Health check → `{"status":"ok","items":15,...}` (registered before the session middleware, never creates a session) |
| `/` | GET | no | Redirects 302 to `/items` |
| `/login` | GET | no | Sign-in form (contains the `_csrf` token) |
| `/login` | POST | no | Form fields `_csrf`, `username`, `password` → 302 to `/items` (or the page that triggered the login); 401 on bad credentials; 403 on bad/missing CSRF token |
| `/logout` | POST | session | Destroys the session → 302 `/login` |
| `/items` | GET | session | Inventory table; filters `?q=`, `?category=`, `?low=1` |
| `/items/new` | GET | session | New-item form |
| `/items` | POST | session | Create item (422 re-renders form with validation errors) |
| `/items/:id/edit` | GET | session | Edit form (404 for unknown id) |
| `/items/:id` | POST | session | Update item |
| `/items/:id/delete` | POST | session, role `admin` | Delete item (403 for clerks) |
| `/admin` | GET | session, role `admin` | Low-stock report, per-category totals, user list (403 for clerks) |
| anything else | any | – | 404 page |

Unauthenticated requests to protected pages are redirected **302** to `/login` (the original URL is remembered
in the session and used after sign-in). All POSTs are checked for the CSRF token first.

## Data / persistence

- `data/inventory.json` (`DATA_DIR`) – lowdb store written on every change. Seeded on first start with 2 users
  (bcryptjs hashes), 3 categories (Fasteners, Power Tools, Safety Gear) and 15 items, several below their
  reorder level so the low-stock report is non-empty. Delete the file to re-seed.
- Sessions live in the process memory (`express-session` MemoryStore): restarting the server signs everyone
  out, and it only works for a single process. express-session prints its standard MemoryStore warning when
  `NODE_ENV=production`; that is expected for this demo.

## Verification performed

Run on macOS with Node 26.5.0 / npm 11.17 and Docker 29. Everything below was executed and returned the
stated result:

- `npm install` → clean install, lockfile generated. `npm audit` reports 2 moderate advisories in Express 4's
  transitive `qs`; the only fix is Express 5, so they are left as-is.
- `npm start` → server listening on :3005 (with the expected `SESSION_SECRET not set` warning), then via curl:
  - `GET /healthz` → 200 JSON with `items: 15`; `GET /favicon.svg` → 200.
  - `GET /`, `/items`, `/admin` without a session → 302 to `/items` / `/login` / `/login`.
  - `GET /login` → 200, `depot.sid` cookie set and `_csrf` token present in the form.
  - `POST /login` without token → 403 "Invalid or missing CSRF token"; with a wrong token → 403; with the
    token but wrong password → 401; with clerk credentials → 302 to `/items`.
  - As clerk: `GET /items` → 200 listing seeded items, no Delete buttons rendered; `GET /admin` → 403;
    `POST /items/:id/delete` → 403.
  - As admin: `GET /admin` → 200 with the low-stock report; the pre-login CSRF token is rejected (403) after
    the session was regenerated on login; with a fresh token `POST /items` created `FST-0099` (302 →
    `/items`, present in `data/inventory.json`), a duplicate-SKU / invalid submit → 422 with error list,
    `GET /items/16/edit` → 200, `POST /items/16` updated the record on disk, `POST /items/16/delete` removed
    it, and the flash message "Deleted FST-0099." appeared on the next page.
  - `GET /items?low=1` and `?q=drill&category=Power%20Tools` → 200 with filtered rows; `/nope` and
    `/items/999/edit` → 404; `POST /logout` → 302 `/login` and `/items` afterwards → 302.
- Docker: `docker build -t demo-05-depot:test .` succeeded (image ~243 MB); `docker run -p 3005:3005` was up
  in ~2 s and passed `/healthz` 200, `/items` → 302, login as clerk → `/items` 200 and `/admin` 403, login as
  admin → `/admin` 200; `/app/data/inventory.json` was created by the unprivileged `app` user.

Not verified: rendering in a real browser (Tailwind CDN styling, the delete confirm dialog),
`COOKIE_SECURE=true` behind HTTPS, and `TRUST_PROXY=true` behind a proxy.
