# Pulsebox — live polls on Bun + Elysia + HTMX

Pulsebox is a small live-polling site: anyone can open a poll, vote (and change their vote), and watch the bars move — the results block is an **HTMX partial** that is swapped in after a vote and re-fetched every 5 seconds, so there is no client-side framework and no build step. The server runs on the **Bun runtime with Elysia**; pages are **server-rendered JSX** (`@elysiajs/html` / `@kitajs/html`) and data lives in **`bun:sqlite`**, Bun's built-in SQLite driver (zero database dependencies). Authentication is **passwordless email OTP**: enter an email, receive a 6-digit code, and get an **HMAC-signed session cookie**. Because the demo has no mail provider, the code is printed to the server log and — outside production — exposed via `GET /dev/last-code?email=…` and on the verify page. Admins are simply the addresses listed in `ADMIN_EMAILS`.

## Stack

- Bun 1.4 (`oven/bun:1` image) — runtime, package manager, `bun:sqlite`
- Elysia 1.4.30 (`elysia`), `@elysiajs/html` 1.4.2 + `@kitajs/html` 4.2.13 (JSX → HTML strings, `safe` attribute for escaping)
- HTMX 2.0.4 from the unpkg CDN (pinned with SRI)
- TypeScript/TSX executed directly by Bun (no compile step); `@types/bun` 1.4.2 for editor support
- SQLite file via `bun:sqlite` (WAL mode)

## Ports

| Port | What |
|------|------|
| 3020 | HTTP |

## Quick start (local)

Requires Bun ≥ 1.2 (not installed on the authoring machine — everything below was run through the `oven/bun:1` Docker image).

```bash
cd 20-bun-elysia-htmx-polls
bun install --frozen-lockfile
cp .env.example .env          # APP_ENV=development enables the OTP helper
bun run dev                   # bun --watch src/index.tsx  -> http://localhost:3020
# production-style: bun run start
```

Log in with any email: after submitting the address, read the code from the terminal (`[pulsebox] login code for … : 123456`) or open `http://localhost:3020/dev/last-code?email=you@example.com`. Use `admin@pulsebox.app` to get the admin role.

## Docker

```bash
cd 20-bun-elysia-htmx-polls
docker build -t pulsebox .
# demo / evaluation (dev helper enabled so you can fetch the OTP over HTTP):
docker run --rm -p 3020:3020 -e APP_ENV=development -v pulsebox-data:/app/data pulsebox
# production-style (helper disabled; read codes from `docker logs`):
docker run --rm -p 3020:3020 -e SESSION_SECRET=$(openssl rand -hex 32) -v pulsebox-data:/app/data pulsebox
```

The image installs dependencies with `bun install --frozen-lockfile --production`, runs as the non-root `bun` user (uid 1000), sets `APP_ENV=production` by default and stores the database at `/app/data/pulsebox.sqlite` (declared `VOLUME`). A bind-mounted `data/` directory must be writable by uid 1000.

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `APP_ENV` | no | `development` (code) / `production` (image) | Anything other than `production` enables `GET /dev/last-code` and prints the OTP on the verify page. |
| `PORT` | no | `3020` | HTTP port. |
| `SESSION_SECRET` | yes (for real use) | `change-me-demo-secret` | HMAC-SHA256 key that signs `pb_session`. The default works for demos; a warning is logged in production. |
| `ADMIN_EMAILS` | no | `admin@pulsebox.app` | Comma-separated emails that are treated as admins. |
| `DB_PATH` | no | `data/pulsebox.sqlite` (image: `/app/data/pulsebox.sqlite`) | SQLite file; directory is created, schema + 3 demo polls seeded when the `polls` table is empty. |

## Default credentials

| Role | Email | Password |
|------|-------|----------|
| admin | `admin@pulsebox.app` | none — request a code and read it from the server log or `/dev/last-code?email=admin@pulsebox.app` (non-production) |
| user | any email | none — same OTP flow |

Codes are 6 digits, valid for 10 minutes, single-use; issuing a new code invalidates the previous one. The session cookie `pb_session` is `httpOnly`, `SameSite=Lax`, 7 days, `Secure` in production. Voters are identified by `user:<email>` when logged in or by an anonymous `pb_voter` cookie otherwise (one vote per poll, changeable).

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/healthz` | GET | no | JSON health (`{"status":"ok","db":"ok",...}`) |
| `/` | GET | no | List polls (open first) |
| `/polls/:id` | GET | no | Poll page: vote form + results (results refresh every 5 s via HTMX) |
| `/polls/:id/vote` | POST | no | HTMX: record/replace the caller's vote, returns the results partial (409 if closed, 422 invalid option) |
| `/polls/:id/results` | GET | no | HTMX results partial |
| `/login` | GET, POST | no | Email form → issues a code, 303 to verify page |
| `/login/verify` | GET, POST | no | Code form → sets `pb_session`, 303 to `?next=` or `/` |
| `/logout` | POST | no | Clears the session cookie |
| `/dev/last-code?email=` | GET | no | **Non-production only**: latest pending code as JSON (404 in production) |
| `/new` | GET, POST | user | Create a poll (question + 2–8 options); `GET /new/option?n=` returns an extra option input via HTMX |
| `/admin` | GET | **admin** | All polls with close/reopen/delete actions (403 for non-admins, 302 to login for guests) |
| `/admin/polls/:id/close`, `/reopen` | POST | **admin** | HTMX: toggles the poll, returns the updated table row |
| `/admin/polls/:id` | DELETE | **admin** | HTMX: deletes the poll (+ votes), returns an empty body so the row disappears |

Guards run in `beforeHandle`: browsers get a 302 to `/login?next=…`; HTMX requests get `401` + `HX-Redirect`.

## Data / persistence

SQLite file at `DB_PATH` (`data/pulsebox.sqlite`; `/app/data` volume in Docker) with tables `polls`, `options`, `votes` (unique per poll + voter key) and `otp_codes`. Created automatically on first start; three demo polls with seed votes are inserted when the `polls` table is empty. `.gitignore` excludes `node_modules/`, `data/*.sqlite*` and `.env`.

## Verification performed

All done on macOS through Docker (Bun is not installed locally):

- `docker run oven/bun:1 bun install` → 43 packages, `bun.lock` written; exact versions then pinned in `package.json` and the lockfile refreshed (`--frozen-lockfile` works).
- `docker build` of the Dockerfile; `docker run -p 3020:3020 -e APP_ENV=development`; log shows `seeded 3 demo polls` and the dev helper notice.
- `GET /healthz` → 200 JSON; `GET /` → 200 HTML listing 3 polls; `GET /polls/1` → 200 with `hx-trigger="every 5s"`; `/polls/999` and `/nope` → 404 HTML page; `/polls/abc` → 422 HTML page.
- Voting: `POST /polls/1/vote` (with `HX-Request`) → 200 partial, sets `pb_voter`, total 27 → 28 and "you voted"; changing the vote keeps the total at 28 and the poll page pre-checks the new option; empty/invalid option → 422 (HTMX alert partial).
- Guards: `/new` and `/admin` anonymous → 302 to `/login?next=…`; with `HX-Request` → 401 + `HX-Redirect`.
- OTP: `POST /login` → 303 to verify page; invalid email → 422; `GET /dev/last-code` returns the code, which also appears in `docker logs` and on the verify page; wrong code → 422; correct code → 303 + `pb_session` cookie; reusing the code → 422; then `/new` → 200, nav shows the email, `/admin` → 403.
- Poll creation: `POST /new` → 303 to the new poll; a question containing `<b>` is rendered escaped; fewer than two options → 422.
- Admin (`admin@pulsebox.app`): `/admin` → 200; close → row partial shows "closed", voting on it → 409 and the poll page says voting is disabled; reopen works; `DELETE /admin/polls/4` → 200 empty body and the poll is gone (404); non-admin `DELETE` → 403.
- Logout → 303 and `/new` → 302 afterwards; a forged/unsigned `pb_session` cookie is ignored (302).
- Production mode (second container without `APP_ENV`): `/healthz` reports `env:"production"`, `/dev/last-code` → 404, the verify page does not show the code, the code from `docker logs` still logs in.
- Containers stopped and removed; `node_modules/` deleted afterwards (lockfile kept).

Not verified: rendering/HTMX behaviour in a real browser (curl only — the 5 s auto-refresh and swaps were checked at the HTTP level), TypeScript type-checking (`tsc` is not part of the project; Bun strips types), and a local non-Docker run.
