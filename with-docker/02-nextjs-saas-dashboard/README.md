# Lumeo Analytics – Next.js 15 SaaS dashboard

Lumeo Analytics is a fictional product-analytics SaaS. It ships a dark marketing site (`/`, `/pricing`), a
role-aware dashboard with metric cards, a projects table and per-project drill-downs, and an admin area
where roles are toggled with a Server Action. What makes it distinct: authentication is a **jose-signed
HS256 JWT stored in an httpOnly cookie**, verified in **`middleware.ts` (Edge runtime)** for
`/dashboard/*` and `/admin/*`; login is a **React 19 `useActionState` Server Action** (also exposed as a
JSON `POST /api/login` for smoke tests); persistence is a self-seeding **JSON file store**; and the app is
built with **`output: "standalone"`**, so `npm start` and the Docker image run the same self-contained
`server.js`.

## Stack

- Node.js 22 (runtime; developed and verified on Node 26.5)
- Next.js 15.5.25 (App Router, Server Actions, middleware, standalone output)
- React 19.3.0 / react-dom 19.3.0
- TypeScript 5.9.3
- Tailwind CSS 4.3.3 via `@tailwindcss/postcss`
- jose 6.2.12 (HS256 JWT sign/verify, Edge-safe)
- bcryptjs 3.0.3 (password hashes)

## Ports

| Port | Purpose |
| --- | --- |
| 3002 | HTTP (marketing site, dashboard, API) |

## Quick start (local)

```bash
cd 02-nextjs-saas-dashboard
cp .env.example .env          # optional; defaults work for a demo
npm ci
npm run build                 # next build + postbuild (copies static assets into .next/standalone)
npm start                     # runs .next/standalone/server.js on PORT (default 3002)
# dev mode with HMR:
npm run dev                   # http://localhost:3002
```

`data/db.json` is created and seeded on the first request.

## Docker

```bash
docker build -t lumeo-analytics .
docker run --rm -p 3002:3002 \
  -e AUTH_SECRET=change-me-demo-secret-lumeo \
  -v lumeo-data:/app/data \
  lumeo-analytics
curl http://localhost:3002/api/health
```

The image is a three-stage `node:22-alpine` build (deps → build → runner). The runner copies only
`.next/standalone` (which already contains `.next/static` and `public/` thanks to the postbuild step), runs
as the unprivileged `nextjs` user, sets `PORT=3002`, `HOSTNAME=0.0.0.0`, `DATA_DIR=/app/data` and declares
`VOLUME /app/data` so the JSON store survives restarts.

## Environment variables

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `AUTH_SECRET` | no (strongly recommended) | `change-me-demo-secret-lumeo` | HS256 secret for signing/verifying the session JWT. Any string; use a long random one in real deployments. Changing it invalidates existing sessions. |
| `PORT` | no | `3002` | Port for the standalone server. |
| `HOST` | no | `0.0.0.0` | Bind address (`npm start` maps it to Next's `HOSTNAME`). |
| `COOKIE_SECURE` | no | `false` | Set `true` behind HTTPS so the cookie carries the `Secure` flag. Leave `false` for plain-HTTP smoke tests, otherwise clients will not send the cookie back. |
| `DATA_DIR` | no | `./data` (Docker: `/app/data`) | Directory containing `db.json`. Must be writable. |
| `NEXT_TELEMETRY_DISABLED` | no | – | Set `1` to silence Next.js telemetry (the Dockerfile does). |

## Default credentials

| Role | Email | Password |
| --- | --- | --- |
| admin | `admin@lumeo.dev` | `Admin123!` |
| member | `user@lumeo.dev` | `User123!` |
| member | `ops@lumeo.dev` | `User123!` |

## Routes

| Path | Method | Auth required? | Description |
| --- | --- | --- | --- |
| `/` | GET | no | Marketing landing page |
| `/pricing` | GET | no | Pricing tiers |
| `/login` | GET | no | Sign-in page; honours `?next=/path` (same-origin paths only). Signed-in users are redirected to `next`. |
| `/login` | POST | no | Server Action form submit (multipart, progressive-enhanced). Redirects 303 to `next` on success. |
| `/api/health` | GET | no | Health check → `{"status":"ok",...}` |
| `/api/login` | POST | no | JSON `{email,password}` (or form-urlencoded) → sets `lumeo_session` cookie, returns `{ok:true,user}`; 401 on bad credentials |
| `/api/logout` | POST | no | Clears the session cookie |
| `/api/projects` | GET | cookie (any role) | JSON list of projects; 401 without a valid cookie |
| `/dashboard` | GET | cookie (any role) | Metric cards + projects table |
| `/dashboard/projects/[id]` | GET | cookie (any role) | Project detail with 7-day chart; 404 for unknown ids |
| `/admin` | GET | cookie, role `admin` | User list with role-toggle Server Action. Members get **403** (`/forbidden` page rendered) |
| `/admin` | POST | cookie, role `admin` | Role-toggle Server Action; members get 403 JSON; you cannot change your own role |
| `/forbidden` | GET | no | 403 page (also rendered in place for non-admins on `/admin`) |

Unauthenticated requests to `/dashboard/*` or `/admin/*` are redirected **307** to `/login?next=<path>` by
`src/middleware.ts`. Expired or tampered cookies are deleted on that redirect.

## Data / persistence

- `data/db.json` (path configurable with `DATA_DIR`) – created and seeded on the first request that touches
  the store: 3 users (bcryptjs hashes, cost 10) and 8 projects with metrics and a 7-day visitor trend.
- Writes (role toggles) use a write-to-temp-then-rename so the file is never left half-written.
- The Docker image declares a volume at `/app/data`. Delete `db.json` to re-seed.
- Sessions are stateless JWTs (8 h expiry) – nothing is stored server-side for them.

## Verification performed

Run on macOS with Node 26.5.0 / npm 11.17 (image build with Docker 29). All of the following were executed
and returned the stated results:

- `npm install` → clean install, lockfile generated (`npm audit` lists 2 advisories that live in Next's
  bundled `postcss`; the only fix is Next 16, so they are left as-is).
- `npx tsc --noEmit` → no errors. `npm run build` → compiled without warnings; standalone output produced and
  postbuild copied static assets into it.
- `npm start` (standalone server on :3002), then with curl:
  - `GET /api/health` → 200 `{"status":"ok"}`; `GET /` → 200 (title "Lumeo Analytics"); `GET /pricing`,
    `GET /login`, `/favicon.svg`, a `/_next/static/chunks/*.js` file → 200.
  - `GET /dashboard` and `GET /admin` without cookie → 307 to `/login?next=%2Fdashboard` / `%2Fadmin`;
    `GET /api/projects` without cookie → 401; tampered `lumeo_session` cookie → 307 to `/login`.
  - `POST /api/login` wrong password → 401; admin credentials → 200 + `Set-Cookie lumeo_session`.
  - With the admin cookie: `/dashboard` 200 (seeded project names rendered), `/dashboard/projects/p_1` 200,
    `/dashboard/projects/nope` 404, `/admin` 200, `/api/projects` 200 JSON.
  - With the member cookie: `/dashboard` 200, `GET /admin` → 403 (page says "Admins only"),
    `POST /admin` → 403 JSON.
  - `POST /api/logout` → 200, subsequent `/dashboard` → 307.
  - Server Action login form submitted as a no-JS multipart POST (hidden `$ACTION_*` fields scraped from
    `/login`) → 303 to the requested `next` path with the cookie set; wrong password re-renders with
    "Invalid email or password".
  - Role-toggle Server Action submitted the same way as admin → 303 to `/admin`, `data/db.json` shows
    `ops@lumeo.dev` switched to `admin` and back; toggling yourself → 303 to `/admin?error=self` and no change.
  - `data/db.json` was auto-created on the first request; the standalone bundle contains no copy of it.
- Docker: `docker build -t demo-02-lumeo:test .` succeeded (three-stage build, image ~312 MB);
  `docker run -p 3002:3002 -e AUTH_SECRET=...` came up in ~2 s and passed the same curl checks from the host:
  `/api/health`, `/`, `/pricing`, `/login`, `/favicon.svg`, a static chunk → 200; `/dashboard` without cookie →
  307; `POST /api/login` → 200 and `/dashboard`, `/dashboard/projects/p_3`, `/admin`, `/api/projects` → 200 with
  the cookie. `/app/data/db.json` was created inside the container by the unprivileged `nextjs` user.

Not verified: browser/JS-side behaviour (client-side form pending state), HTTPS + `COOKIE_SECURE=true`,
and `npm run dev`. Curl-driven Server Action calls log a harmless "Missing `origin` header" warning because
curl sends no `Origin` header; browsers do.

Build note: `bcryptjs` is pure JS, so no native compilation is needed on any architecture.
