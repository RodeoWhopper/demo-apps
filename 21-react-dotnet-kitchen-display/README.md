# Ocakbaşı KDS – Restaurant Kitchen Display System (React SPA hosted by an ASP.NET Core Minimal API, SignalR real-time)

Ocakbaşı KDS is the order screen system of a small grill restaurant: guests scan their table code and order from `/order/M1`, the kitchen works a live queue at `/kitchen` (Received → Preparing → Ready → Served), the dining room shows a public big-screen board at `/` and admins maintain the menu and staff accounts. Its place in the demo set is **one deployable, one port**: an **ASP.NET Core 10 Minimal API** (no controllers, no Razor) that also **hosts the production React build from `wwwroot`** (`UseDefaultFiles` + `UseStaticFiles` + `MapFallbackToFile("index.html")`, while `/api/*` and `/hubs/*` never fall back and answer JSON 404s). Every screen updates in real time through a **SignalR hub over WebSockets** (`/hubs/orders`, anonymous). Staff authentication is a **bearer-JWT hybrid**: a 15-minute HS256 access token kept only in memory by the SPA plus an **httpOnly, SameSite=Strict refresh cookie** (`kds_refresh`) that is stored hashed, rotated on every refresh, revoked on logout and family-revoked on reuse. The public order endpoint is **rate limited** (fixed window per IP) and every error is an RFC 9457 problem document. Built-in OpenAPI (`/openapi/v1.json`) with a Scalar UI (`/scalar`, assets embedded – no CDN).

## Stack

- **api/** – .NET 10 SDK (`net10.0`; verified with SDK 10.0.302), ASP.NET Core Minimal APIs, SignalR, rate limiting, health checks and `PasswordHasher<T>` (`Microsoft.Extensions.Identity.Core`) from the shared framework – no full ASP.NET Core Identity
  - `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.12, `Microsoft.AspNetCore.OpenApi` 10.0.12, `Scalar.AspNetCore` 2.17.3
  - EF Core 10.0.12 (`Microsoft.EntityFrameworkCore.Sqlite`, `Microsoft.EntityFrameworkCore.Design`), `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore` 10.0.12, `dotnet-ef` 10.0.12 as a local tool (`api/.config/dotnet-tools.json`), committed `Init` migration
- **web/** – Node 22 (`node:22-alpine` build stage; verified locally on Node 26.5 / npm 11.17), React 19.3.0, React Router 7.18.3 (library mode, `createBrowserRouter`), Vite 7.3.6, TypeScript 5.9.3, Tailwind CSS 4.3.3 (`@tailwindcss/vite`), `@microsoft/signalr` 10.0.11, `@vitejs/plugin-react` 5.2.0
- **Docker** – three-stage `Dockerfile`: `node:22-alpine` (SPA build) → `mcr.microsoft.com/dotnet/sdk:10.0` (restore + publish, SPA copied into `wwwroot/`) → `mcr.microsoft.com/dotnet/aspnet:10.0` (non-root `app` user)
- No runtime network dependencies: no CDN scripts/fonts, Scalar's UI bundle is served from the app itself

## Ports

| Port | What |
|------|------|
| 8021 | HTTP (Kestrel): SPA, `/api/*`, `/hubs/orders` (WebSocket), `/healthz`, `/openapi`, `/scalar` – the only port in production and in Docker |
| 5021 | **Dev only** – Vite dev server with HMR; proxies `/api`, `/hubs` (ws), `/healthz`, `/openapi`, `/scalar` to 8021 |

## Quick start (local)

```bash
cd 21-react-dotnet-kitchen-display

# 1) build the SPA once (the API serves ../web/dist automatically when it exists)
cd web && npm ci && npm run build && cd ..

# 2) run the API – applies the migration, seeds the demo data and serves everything on http://localhost:8021
cd api && dotnet restore && dotnet run
```

Production-style (this is what `deploy.json` uses):

```bash
cd web && npm ci && npm run build && cd ../api
dotnet publish -c Release -o out /p:UseAppHost=false   # bundles ../web/dist into out/wwwroot/
dotnet out/Kds.Api.dll                                  # run from api/ → database in api/data/kds.db
```

Development with hot reload – two terminals:

```bash
cd api && dotnet run          # API on 8021
cd web && npm run dev         # SPA on http://localhost:5021 (everything non-SPA is proxied to 8021, WebSockets included)
```

Other useful commands: `cd web && npm run typecheck`; schema change → `cd api && dotnet tool restore && dotnet ef migrations add <Name> -o Persistence/Migrations`.

**How the SPA is served.** `Program.cs` picks the first existing web root out of `<cwd>/wwwroot` (publish output / Docker), `<dll directory>/wwwroot` (published DLL started from another directory) and `<cwd>/../web/dist` (plain `dotnet run` during development); if none exists the process still starts as a pure API and logs `Web root: (none - API only)`. `dotnet publish` copies `../web/dist/**` into the publish output's `wwwroot/` through the `IncludeSpaInPublish` MSBuild target in `Kds.Api.csproj` (only when the folder exists, so building the API without the SPA also works). Note that the EF Core source folder is called `Persistence/` rather than `Data/` on purpose – on case-insensitive file systems (macOS, Windows) `Data/` would merge with the `data/` directory that holds the SQLite file.

## Docker

```bash
cd 21-react-dotnet-kitchen-display
docker build -t ocakbasi-kds .
docker run --rm -p 8021:8021 -v ocakbasi-data:/app/data ocakbasi-kds
# open http://localhost:8021  (board) · /order/M1 (guest) · /kitchen (staff) · /scalar (API reference)
```

The image builds the SPA with Node 22, publishes the API with the .NET 10 SDK (SPA bundled as `wwwroot/`) and runs `dotnet Kds.Api.dll` on `mcr.microsoft.com/dotnet/aspnet:10.0` as the non-root `app` user (uid 1654) with `ASPNETCORE_URLS=http://+:8021` and `ConnectionStrings__Default="Data Source=/app/data/kds.db"`. `/app/data` is declared as a `VOLUME` (database + WAL files); a bind-mounted host directory must be writable by uid 1654. Pass any variable from the table below with `-e`, e.g. `-e JWT_SECRET=... -e COOKIE_SECURE=true -e TRUST_PROXY_HEADERS=true` behind an HTTPS reverse proxy.

**Reverse proxies must forward WebSocket upgrades** for `/hubs/`, otherwise the SignalR client silently degrades to long polling. nginx example:

```nginx
location / {
    proxy_pass         http://127.0.0.1:8021;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection "upgrade";
    proxy_set_header   Host $host;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;   # SignalR keeps the socket open (server pings every 15 s)
}
```

## Environment variables

All optional – the app runs with the defaults (see `.env.example`). Values marked *demo* must be changed for anything but a demo.

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `ASPNETCORE_URLS` | no | `http://0.0.0.0:8021` (code fallback; image sets `http://+:8021`) | Listen address(es); `--urls` on the command line also works |
| `ASPNETCORE_ENVIRONMENT` | no | `Production` | `Development` only raises log verbosity |
| `JWT_SECRET` | no | `change-me-demo-secret-ocakbasi-kds-32chars` (*demo*) | HS256 key for access tokens; must be ≥ 32 characters (startup fails otherwise). Using the default logs a warning |
| `JWT_ISSUER` | no | `ocakbasi-kds` | Issuer and audience claim |
| `ACCESS_TOKEN_MINUTES` | no | `15` | Access token lifetime; the SPA refreshes 60 s before expiry |
| `REFRESH_TOKEN_DAYS` | no | `7` | Lifetime of the `kds_refresh` cookie / stored refresh token |
| `COOKIE_SECURE` | no | `false` | `true` adds the `Secure` flag to `kds_refresh` – set it when served over HTTPS |
| `TRUST_PROXY_HEADERS` | no | `false` | `true` applies `X-Forwarded-For` / `X-Forwarded-Proto` from any upstream proxy (needed so rate limiting sees real client IPs) |
| `CORS_ORIGINS` | no | `http://localhost:5021` | Comma-separated origins allowed to call the API with credentials; only relevant when the SPA is served from another origin (Vite dev). Production is same-origin |
| `ORDERS_PER_MINUTE` | no | `10` | Fixed-window permit count for `POST /api/orders` per client IP (`POST /api/auth/login` has a fixed 20/min brake) |
| `ConnectionStrings__Default` | no | `Data Source=data/kds.db` (image: `/app/data/kds.db`) | SQLite connection string; the directory is created automatically |

## Default credentials

| Role | Email | Password | Can do |
|------|-------|----------|--------|
| Admin | `admin@ocakbasi.dev` | `Admin123!` | everything: kitchen queue, `/admin/menu` (CRUD + availability), `/admin/users` (create/delete staff) |
| Staff | `sef@ocakbasi.dev` | `Sef123!` | `/kitchen`: list orders, change statuses, view stats – admin pages/endpoints answer 403 |

Guests never sign in: `/order/{tableCode}` and the board are public. There is no self-registration; admins create accounts. Passwords are stored as `PasswordHasher<User>` hashes (PBKDF2).

## Routes

SPA pages (all served as `index.html`, routing happens in the browser):

| Path | Method | Auth required? | Description |
|------|--------|----------------|-------------|
| `/` | GET | no | Public big-screen board: Received / Preparing / Ready / Served columns with table codes and waiting minutes, live |
| `/order/:tableCode` | GET | no | Guest flow: menu grouped by category → place order → follow it live (stepper); the order id is remembered per table in `sessionStorage` |
| `/login` | GET | no | Staff sign-in (`?next=` is honoured for same-site paths); demo accounts are listed on the page |
| `/kitchen` | GET | Staff or Admin | Queue with large touch buttons: Start preparing / Mark ready / Served / Cancel; stats strip |
| `/admin/menu` | GET | Admin | Menu CRUD with availability toggle (Staff sees a 403 page) |
| `/admin/users` | GET | Admin | Staff accounts: list, create, delete (not yourself) |
| any other path | GET | no | SPA 404 page (except `/api/*` and `/hubs/*`, see below) |

API and infrastructure endpoints (JSON; errors are `application/problem+json`):

| Path | Method | Auth required? | Description |
|------|--------|----------------|-------------|
| `/healthz` | GET | no | Health check incl. EF Core `DbContext` check → `{"status":"Healthy","checks":[…]}` (200) / 503 |
| `/openapi/v1.json` | GET | no | OpenAPI 3 document (built-in `AddOpenApi`, Bearer security scheme declared) |
| `/scalar`, `/scalar/v1` | GET | no | Scalar API reference UI (assets embedded) |
| `/api/menu` | GET | no | Available menu items |
| `/api/orders` | POST | no – **rate limited 10/min per IP** | `{tableCode, note?, lines:[{menuItemId, qty}]}` → 201 + `Location`; 400 validation problem (`errors` map), 429 with `Retry-After: 60` |
| `/api/orders/{id}` | GET | no | Guest order tracking (status, lines, timestamps, total) |
| `/api/board` | GET | no | Today's orders (active ones always) without notes: `{generatedAt, orders:[{id, tableCode, status, createdAt, updatedAt, itemCount}]}` |
| `/api/auth/login` | POST | no (20/min per IP) | `{email, password}` → `{accessToken, expiresAt, user}` + `Set-Cookie: kds_refresh` (HttpOnly, SameSite=Strict, Path=/api/auth); 401 on bad credentials |
| `/api/auth/refresh` | POST | refresh cookie | Rotates the cookie and returns a new access token; 401 if missing/expired/revoked – presenting an already-rotated cookie revokes all sessions of that user |
| `/api/auth/logout` | POST | refresh cookie (optional) | Revokes the refresh token and clears the cookie → 204 |
| `/api/auth/me` | GET | Bearer | Current user |
| `/api/orders?status=` | GET | Bearer, `StaffOrAdmin` | Latest 200 orders with lines and notes, optional status filter (400 for an unknown status) |
| `/api/orders/{id}/status` | PATCH | Bearer, `StaffOrAdmin` | `{status}`; allowed transitions Received→Preparing/Cancelled, Preparing→Ready/Cancelled, Ready→Served; otherwise 409; unknown status 400 |
| `/api/stats` | GET | Bearer, `StaffOrAdmin` | Today's counts per status, average preparation minutes, served revenue, active order count |
| `/api/menu/admin` | GET, POST | Bearer, `AdminOnly` | All items incl. unavailable / create item (`{name, category, price, isAvailable}`) |
| `/api/menu/admin/{id}` | PUT, DELETE | Bearer, `AdminOnly` | Update / delete; delete answers 409 when the item appears on orders (mark it unavailable instead) |
| `/api/users` | GET, POST | Bearer, `AdminOnly` | List / create (`{email, password ≥ 8, role: Admin|Staff}`; 409 duplicate) |
| `/api/users/{id}` | DELETE | Bearer, `AdminOnly` | Delete a user (400 for your own account) |
| `/api/*` (anything else) | any | – | 404 problem document – never the SPA |
| `/hubs/orders` | SignalR | no | Hub (WebSockets, SSE and long-polling transports); `POST /hubs/orders/negotiate?negotiateVersion=1` is the handshake |

Missing or invalid token → **401** problem document with `WWW-Authenticate: Bearer`; wrong role → **403** problem document. The SPA mirrors the policies: anonymous visitors are redirected to `/login?next=…`, the wrong role renders a 403 page.

**Real-time.** The hub is read-only and anonymous. Server → client events: `orderCreated(order)`, `orderUpdated(order)` (full order DTO incl. lines and note – orders never contain personal data) and `menuChanged({action, itemId})`. The SPA opens one connection (`withAutomaticReconnect`) shared by all pages, shows its state in the header ("Live / Reconnecting / Offline") and re-fetches on reconnect; the board and the guest page also poll as a fallback. Staff calls (`PATCH …/status`, menu changes) trigger the broadcasts; a JWT can be passed as `?access_token=` on hub URLs but is not required.

## Data / persistence

- SQLite database at `api/data/kds.db` locally (`ConnectionStrings__Default`, WAL mode → `-shm`/`-wal` side files) or `/app/data/kds.db` on the `/app/data` volume in Docker. Delete the file to reset.
- Schema from the committed EF Core migration `api/Persistence/Migrations/…_Init` applied with `Database.Migrate()` at startup. `DbSeeder` is idempotent per table: 2 users, 12 menu items in 4 categories (Mezeler, Izgaralar, Pideler, İçecekler) and 6 orders in mixed statuses (timestamps relative to the first start) are inserted only when the respective table is empty.
- Refresh tokens live in the `RefreshTokens` table as SHA-256 hashes with expiry/revocation timestamps; deleting a user cascades to their tokens. Access tokens are stateless (in memory in the SPA, never in storage).
- Rate-limiter counters are in memory (per process, reset on restart).

## Verification performed

Run on macOS with .NET SDK 10.0.302, Node 26.5.0 / npm 11.17.0 and Docker 29 on 2026-09-11 (all processes, containers, volumes and images were removed afterwards):

- **web**: `npm install` (lockfile committed, `npm ci` used in Docker) and `npm run build` (`tsc --noEmit && vite build`) → no type errors, 82 modules, ~407 kB JS / ~28 kB CSS in `dist/`.
- **api**: `dotnet restore`, `dotnet build -c Release` → 0 warnings, 0 errors. `dotnet tool restore` + `dotnet ef migrations add Init -o Persistence/Migrations` generated the committed migration. `dotnet publish -c Release -o out /p:UseAppHost=false` printed `bundling SPA from ../web/dist into wwwroot/` and produced `out/wwwroot/{index.html,assets/,kds.svg}`.
- **`dotnet run` on :8021** (Production environment, web root resolved to `../web/dist`, `Init` applied, seeder logged 2 users / 12 menu items / 6 orders). A scripted curl suite of 80 checks passed, among them: `GET /healthz` → 200 `{"status":"Healthy",…"database"…}`; `/`, `/kitchen`, `/admin/menu`, `/order/M1` → 200 `text/html` (SPA fallback), `/kds.svg` → 200; `GET /api/nope` and `/hubs/nope` → 404 `application/problem+json`; `/openapi/v1.json` → 200 (14 paths, Bearer scheme), `/scalar` and `/scalar/v1` → 200 with no external URLs in the page; `GET /api/menu` → 12 items in 4 categories; `POST /api/orders` → 201 with `Location`, `GET /api/orders/{id}` → 200, unknown id → 404, invalid body → 400 with `errors` map; `GET /api/board` → 200 (no `note` field); rate limit: exactly 10 × 201 within the window, then 429 `application/problem+json` with `Retry-After: 60`; login wrong password → 401 problem, empty body → 400, correct → `accessToken` (JWT payload `iss/aud=ocakbasi-kds, sub, email, role, jti, exp = iat + 15 min`) + `Set-Cookie: kds_refresh=…; path=/api/auth; samesite=strict; httponly` (no `Secure` with the default `COOKIE_SECURE=false`); `/api/auth/me` → 200 with / 401 without token; `GET /api/orders` → 401 problem + `WWW-Authenticate: Bearer` without token, 401 with a garbage token, 200 as Staff; `?status=Received` filter, `?status=bogus` → 400; `PATCH` Received→Preparing→Ready → 200 (`readyAt` set), Ready→Received → 409, Served→Received → 409 problem, unknown status → 400, unknown order → 404, no token → 401; `/api/stats` → 200; `/api/users`, `/api/menu/admin` (GET and POST) as Staff → 403 problem; as Admin: users list → 200, create → 201 (new user could log in), duplicate → 409, bad role/short password → 400, delete self → 400, delete → 204, again → 404; menu create → 201 (public menu 13), update to unavailable → 200 (public menu back to 12), invalid price → 400, delete → 204, delete of a referenced item → 409; `POST /api/auth/refresh` with the cookie → 200 with a new token and a **different** cookie value, reusing the old cookie → 401 and the newer cookie is then revoked as well → 401; fresh login + `POST /api/auth/logout` → 204 (cookie cleared), refresh with the pre-logout cookie → 401, refresh without cookie → 401; `POST /hubs/orders/negotiate?negotiateVersion=1` → 200 with `connectionId` and WebSockets/SSE/LongPolling transports; CORS preflight from `http://localhost:5021` gets `Access-Control-Allow-Origin`, another origin gets none.
- **Published DLL**: `ConnectionStrings__Default="Data Source=data/kds-publish-test.db" dotnet out/Kds.Api.dll --urls http://0.0.0.0:8121` from `api/` → web root `out/wwwroot`, fresh database seeded, `/healthz` 200, `/` and `/kitchen` HTML, 12 menu items (both overrides honoured).
- **SignalR end-to-end**: a Node script using `@microsoft/signalr` with pure WebSockets (`skipNegotiation`) connected to `/hubs/orders`, `invoke("Ping")` → `pong`, then created an order over `fetch` and received `orderCreated` with the same id, then patched it as Staff and received `orderUpdated` with status `Preparing`. The same script passed through the Vite dev server on 5021 (`ws: true` proxy); `npm run dev` also proxied `/api/menu`, `/healthz`, `/openapi/v1.json`, the negotiate call and the login (cookie set) correctly.
- **Browser** (Chromium, against `dotnet run`): the board rendered the four columns with the "Live" indicator; `/kitchen` as a visitor redirected to `/login?next=/kitchen`; signing in as Staff opened the queue with stats, notes and large buttons; "Start preparing" moved table M4 from Received to Preparing; `/admin/menu` as Staff rendered the 403 page and the session survived the full page load (silent cookie refresh); signing in as Admin landed on `/admin/menu` (12 items, availability switches) and `/admin/users` listed both accounts; on `/order/M1` two Adana Kebap were added and "Place order" created order #16 (₺760) and switched to the tracking view; advancing that order to Preparing and Ready through the API updated the stepper live without a reload. The only console error was the expected 401 of the silent `/api/auth/refresh` for an anonymous visitor.
- **Docker**: `docker build -t ocakbasi-kds:verify .` succeeded (node:22-alpine → sdk:10.0 → aspnet:10.0, image ≈ 434 MB). `docker run -d -p 8021:8021 -v kds-verify-data:/app/data …` → `/healthz` 200, `/` and `/kitchen` HTML, `/api/nope` JSON 404, 12 menu items, process runs as `uid=1654(app)`, `/app/data/kds.db` (+ WAL files) owned by `app`, `/app/wwwroot` contains the SPA; the SignalR WebSocket script passed against the container; `docker restart` on the same volume → the order created before the restart was still there with its updated status and the second boot logged no seeding; the complete 80-check curl suite then passed against the container (fresh rate-limit window: 10 × 201, then 429).
- **Not verified**: HTTPS / `COOKIE_SECURE=true` / `TRUST_PROXY_HEADERS=true` behind a real reverse proxy; the SPA's timer-based refresh at the 14-minute mark and access-token expiry after 15 minutes (only immediate refresh/rotation calls were exercised); refresh-token expiry after 7 days; the SSE and long-polling fallback transports; bind-mount permissions on a Linux host (only a named volume was used); the admin create/edit/delete forms in the browser (the endpoints were verified with curl, the pages were only rendered).
- Cleanup: container, volume and image removed; `web/node_modules`, `web/dist`, `api/bin`, `api/obj`, `api/out` and `api/data/kds.db*` deleted (lockfile, tool manifest and migration kept).
