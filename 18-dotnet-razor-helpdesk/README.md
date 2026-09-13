# Masaüstü Destek – ASP.NET Core Razor Pages IT Helpdesk

Masaüstü Destek is an internal IT helpdesk: employees (requesters) open tickets and follow them through comments, agents pick tickets up and change their status, and admins manage users, roles and categories. Its place in the demo set: **ASP.NET Core 10 Razor Pages** (page-per-file routing with named handler methods such as `?handler=Comment`), **ASP.NET Core Identity with cookie authentication but hand-written account pages** (`Account/Login`, `Account/Logout`, `Account/Register` built on `SignInManager` / `UserManager`, no scaffolded Identity UI), three roles enforced both by **folder conventions** (`AuthorizeFolder("/Admin", "AdminOnly")`, `AuthorizeFolder("/Tickets")`) and by attributes (`[Authorize(Roles = "Admin")]`), plus **EF Core migrations** (committed `Init` migration applied with `Database.Migrate()` at startup) on SQLite.

## Stack

- .NET 10 SDK (`net10.0`; verified with SDK 10.0.302 / ASP.NET Core runtime 10.0.10)
- ASP.NET Core Razor Pages, ASP.NET Core Identity (`Microsoft.AspNetCore.Identity.EntityFrameworkCore` 10.0.12)
- EF Core 10.0.12 with SQLite (`Microsoft.EntityFrameworkCore.Sqlite`, `Microsoft.EntityFrameworkCore.Design`), `dotnet-ef` 10.0.12 as a local tool (`.config/dotnet-tools.json`)
- Health checks (`MapHealthChecks("/healthz")` with a custom SQLite check), Data Protection keys persisted to disk
- Bootstrap 5.3.3 via jsDelivr CDN (only runtime network dependency, browser side)
- Docker: `mcr.microsoft.com/dotnet/sdk:10.0` build stage → `mcr.microsoft.com/dotnet/aspnet:10.0` runtime, non-root `app` user

## Ports

| Port | What |
|------|------|
| 8018 | HTTP (Kestrel) – the only port |

## Quick start (local)

```bash
cd 18-dotnet-razor-helpdesk
dotnet restore
dotnet build
dotnet run                      # http://localhost:8018 (falls back to 0.0.0.0:8018 when ASPNETCORE_URLS is unset)
# production-style:
dotnet publish -c Release -o out /p:UseAppHost=false
dotnet out/Helpdesk.dll
```

On first start the `Init` migration creates `data/helpdesk.db` and the seeder adds roles, users, categories and tickets. To change the schema: `dotnet tool restore && dotnet ef migrations add <Name> -o Persistence/Migrations`.

## Docker

```bash
docker build -t masaustu-destek .
docker run --rm -p 8018:8018 -v masaustu-data:/app/data masaustu-destek
```

The image publishes in the SDK stage and runs `dotnet Helpdesk.dll` as the non-root `app` user (uid 1654) with `ASPNETCORE_URLS=http://+:8018`, `ConnectionStrings__Default="Data Source=/app/data/helpdesk.db"` and `VOLUME /app/data` (database + Data Protection keys). A bind-mounted host directory must be writable by uid 1654.

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `ASPNETCORE_URLS` | no | `http://0.0.0.0:8018` (code fallback) | Listen address; Docker image sets `http://+:8018` |
| `ASPNETCORE_ENVIRONMENT` | no | `Production` | `Development` enables developer exception pages |
| `ConnectionStrings__Default` | no | `Data Source=data/helpdesk.db` (`/app/data/helpdesk.db` in Docker) | SQLite connection string; its directory is created automatically and also stores `keys/` |

See `.env.example`.

## Default credentials

| Role | Email | Password | Can do |
|------|-------|----------|--------|
| Admin | `admin@masaustu.dev` | `Admin123!` | everything: all tickets, status/assignment, `/Admin/Users`, `/Admin/Categories` |
| Agent | `agent@masaustu.dev` | `Agent123!` | all tickets, change status, assign to self |
| Requester | `user@masaustu.dev` | `User123!` | own tickets only: create, comment |

Anyone can self-register at `/Account/Register`; new accounts get the Requester role. Password policy: ≥ 8 chars with upper/lower case, digit and symbol.

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/healthz` | GET | no | Health check → `Healthy` (200) / `Unhealthy` (503) based on a SQLite connection test |
| `/` | GET | no | Landing page with ticket stats and categories |
| `/Account/Login` | GET, POST | no (antiforgery) | Custom login page; `Input.Email`, `Input.Password`, `Input.RememberMe`, `ReturnUrl` |
| `/Account/Register` | GET, POST | no (antiforgery) | Create a Requester account and sign in |
| `/Account/Logout` | POST | signed in (antiforgery) | Sign out (GET just redirects home) |
| `/AccessDenied` | GET | no | Access-denied page, responds with **403** |
| `/Error` | GET | no | Error page (`?code=404` etc. via status-code re-execution) |
| `/Tickets` | GET | `[Authorize]` + folder convention | Ticket list with `Status`, `Priority`, `Q` filters; requesters see only their own |
| `/Tickets/Create` | GET, POST | `[Authorize]` | Open a ticket (title, description, category, priority) |
| `/Tickets/Details/{id}` | GET | `[Authorize]` | Ticket with comments; requesters get 403 for others' tickets |
| `/Tickets/Details/{id}?handler=Comment` | POST | `[Authorize]` | Add a comment |
| `/Tickets/Details/{id}?handler=Status&status=…` | POST | Agent / Admin | Change status (requesters → 403) |
| `/Tickets/Details/{id}?handler=Assign[&clear=true]` | POST | Agent / Admin | Assign to self / unassign |
| `/Admin/Users` | GET | `AdminOnly` policy + `[Authorize(Roles="Admin")]` | Users with roles and ticket counts |
| `/Admin/Users?handler=SetRole` | POST | Admin | Change a user's role (`userId`, `role`) – not your own |
| `/Admin/Categories` | GET | `AdminOnly` policy (folder convention only, no attribute) | Category list + create/edit form (`?edit=id`) |
| `/Admin/Categories?handler=Save` / `?handler=Delete&id=…` | POST | Admin | Create/update / delete (refused while tickets reference it) |
| `/css/*` | GET | no | Static assets from `wwwroot` |

Unauthenticated requests to protected pages redirect (302) to `/Account/Login?ReturnUrl=…`; authenticated but unauthorised requests redirect (302) to `/AccessDenied`, which renders with HTTP 403. All POSTs require the antiforgery cookie + `__RequestVerificationToken` field (a POST without it gets 400).

## Data / persistence

- SQLite database at `data/helpdesk.db` (WAL mode → `-shm`/`-wal` side files); in Docker at `/app/data/helpdesk.db` on the `/app/data` volume. Delete the file to reset.
- Schema from EF Core migrations in `Persistence/Migrations` (`Init`), applied with `Database.Migrate()` at startup; `DbSeeder` adds roles Admin/Agent/Requester, the 3 demo users, 4 categories, 10 tickets and 5 comments when the database is empty.
- Data Protection keys (used to encrypt the auth cookie) are persisted to `data/keys/` so sign-ins survive restarts and container recreation (keys are stored unencrypted at rest – fine for a demo, use a key vault/certificate in production).
- Note for macOS/Windows contributors: the source folder is named `Persistence/` (not `Data/`) precisely so it cannot collide with the `data/` directory on case-insensitive file systems.

## Verification performed

Run on macOS with .NET SDK 10.0.302 and Docker 29.6.2 on 2026-09-10:

- `dotnet restore`, `dotnet build -c Release` → 0 warnings, 0 errors; `dotnet tool install dotnet-ef --version 10.0.12` + `dotnet ef migrations add Init -o Persistence/Migrations` → migration generated and committed.
- `dotnet run` (Production environment) on :8018 and later on :8118 via `ASPNETCORE_URLS` (override confirmed) – verified with curl:
  - `GET /healthz` → 200 `Healthy`; `/`, `/Account/Login`, `/Account/Register`, `/css/site.css` → 200; unknown path → 404 with the custom error page.
  - Anonymous `/Tickets`, `/Tickets/Create`, `/Tickets/Details/1`, `/Admin/Users`, `/Admin/Categories` → 302 to `/Account/Login?ReturnUrl=…`.
  - Login flow: GET `/Account/Login` (antiforgery cookie + `__RequestVerificationToken`), wrong password → 200 with error, POST without token → 400; requester credentials → 302 `/Tickets`, then `/Tickets` → 200 listing only that user's 7 tickets; another user's ticket → 302 `/AccessDenied`; `/Admin/Users` and `/Admin/Categories` → 302 `/AccessDenied`, and `/AccessDenied` responds 403.
  - Requester created a ticket (302 → `/Tickets/Details/11`), invalid form → 200 with validation errors, added a comment (visible), attempted a status change → 302 `/AccessDenied` and the status did not change.
  - Agent: sees all 11 tickets, status change to InProgress works, `/Admin/Users` → 302 `/AccessDenied`.
  - Admin: `/Admin/Users`, `/Admin/Categories`, `/Tickets` → 200; category created, listed and deleted (row count 1 → 0), deleting a category with tickets is refused with a flash message, duplicate name → validation error; role change of the requester to Agent and back reflected in the list; `/Account/Register` created a new account and redirected to `/Tickets` (200).
  - POST `/Account/Logout` → 302 and `/Admin/Users` afterwards → 302 to login.
  - Restart test: app stopped and started again – the pre-restart auth cookie still worked (Data Protection keys persisted in `data/keys`), the created ticket was still there and the seeder did not run again.
- `docker build` (multi-stage, `sdk:10.0` → `aspnet:10.0`, both images pulled fine) → OK; `docker run -p 8018:8018 -v md-verify-data:/app/data` → `/healthz` 200, `/` 200, `/Tickets` 302 to login, admin login + category create/delete (refusal for categories with tickets), requester 302 → `/AccessDenied` (403), ticket creation; runs as uid 1654 `app`, `/app/data/helpdesk.db` and `/app/data/keys/` owned by it. Container restart on the same volume: the pre-restart cookie still authenticated (200), the created ticket was present and no re-seed happened.
- Not verified: HTTPS/reverse-proxy headers, e-mail flows (none exist), bind-mount permissions on a Linux host (only a named volume was tested).
- `bin/`, `obj/`, `data/helpdesk.db*`, `data/keys/`, the verification image and volume were removed afterwards.
