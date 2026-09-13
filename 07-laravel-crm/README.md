# Halka CRM — Laravel contacts & deals pipeline

Halka CRM is a small sales CRM: a searchable **contacts** directory and a **deals** pipeline where every deal moves through `lead → qualified → won / lost` with a value and expected close date; the dashboard rolls the pipeline up per stage. It is a **Laravel 13** application (the current release when it was scaffolded; the framework requires PHP ≥ 8.3) with Blade templates styled by Tailwind from a CDN — there is deliberately **no Vite/npm build step**. Authentication is Laravel's built-in **session guard driven by a hand-written `LoginController`** (`Auth::attempt`, no Breeze/Jetstream), the `auth` middleware protects the app and a custom `EnsureUserIsAdmin` middleware (alias `admin`) fences off `/admin/*`. Validation lives in FormRequests, lists are paginated, CSRF is the framework's `_token`. Storage is SQLite; the container entrypoint migrates and seeds idempotently on every start.

## Stack

- PHP 8.3 (`php:8.3-cli` image; Composer's platform is pinned to 8.3 so the lockfile resolves Symfony 7.4)
- Laravel framework 13.31 (`laravel/framework`), Blade, Eloquent, FormRequests, resource routes
- SQLite via `pdo_sqlite` (bundled in the official PHP image)
- `fakerphp/faker` 1.24 (moved to `require` so `--seed` works in the `--no-dev` image)
- Tailwind CSS via CDN (`cdn.tailwindcss.com`)
- Docker: multi-stage build (`composer:2` → `php:8.3-cli`), served by `php artisan serve --no-reload` with `PHP_CLI_SERVER_WORKERS=4`

## Ports

| Port | What |
|------|------|
| 8007 | HTTP (`artisan serve`) |

## Quick start (local)

Requires PHP 8.3+ with `pdo_sqlite` and Composer.

```bash
cd 07-laravel-crm
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed          # seeder is idempotent
php artisan serve --port=8007       # http://localhost:8007
```

`composer run setup` performs the same steps in one go.

## Docker

```bash
cd 07-laravel-crm
docker build -t halka-crm .
docker run --rm -p 8007:8007 -v halka-data:/data -e APP_KEY="base64:$(head -c 32 /dev/urandom | base64)" halka-crm
# http://localhost:8007
```

What the image does on start (`docker/entrypoint.sh`):

1. creates the SQLite file at `DB_DATABASE` (default `/data/database.sqlite`) if missing;
2. if `APP_KEY` is empty, mints a temporary key with `php artisan key:generate --show` (sessions reset on restart — pass `APP_KEY` for stable sessions);
3. `php artisan migrate --force --seed` — migrations are idempotent and `DatabaseSeeder` returns early once a user exists;
4. `php artisan optimize` (config/route/view/event caches);
5. `php artisan serve --host=0.0.0.0 --port=8007 --no-reload` (PHP's built-in server; fine for a demo, put a reverse proxy in front for TLS).

The process runs as root inside the container so the `/data` volume is always writable.

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `APP_KEY` | no | *(empty → temporary key generated at start)* | Laravel encryption key (`base64:...`). Set it to keep sessions/cookies valid across restarts. |
| `APP_ENV` | no | `production` (image) / `local` (`.env.example`) | Environment name. |
| `APP_DEBUG` | no | `false` (image) | Show stack traces. |
| `APP_URL` | no | `http://localhost:8007` | Base URL for generated links. |
| `DB_CONNECTION` | no | `sqlite` | Only SQLite is shipped. |
| `DB_DATABASE` | no | `/data/database.sqlite` (image) / `database/database.sqlite` (local) | SQLite file path; relative paths resolve against the project root. |
| `SESSION_DRIVER` | no | `file` | `file` or `database` (the sessions table exists). |
| `CACHE_STORE` | no | `file` | Cache store. |
| `QUEUE_CONNECTION` | no | `sync` | Queue driver (nothing is queued in the demo). |
| `LOG_CHANNEL` | no | `stderr` (image) | Log channel. |
| `PHP_CLI_SERVER_WORKERS` | no | `4` | Worker processes for the built-in server. |

## Default credentials

| Role | Email | Password |
|------|-------|----------|
| admin | `admin@halka.dev` | `Admin123!` |
| rep | `rep@halka.dev` | `Rep123!` |

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/healthz` | GET | no | JSON health check; skips the `web` middleware group (no session cookie) |
| `/up` | GET | no | Laravel's built-in health page |
| `/` | GET | no | Redirects to `/dashboard` or `/login` |
| `/login` | GET | no | Login form |
| `/login` | POST | no (CSRF, throttled 10/min) | `Auth::attempt`; 419 without token, 302 back with errors on failure |
| `/logout` | POST | yes | Sign out |
| `/dashboard` | GET | yes | Pipeline summary per stage, open/won totals, recent + closing-soon deals |
| `/contacts` | GET | yes | Paginated list, `?q=` search on name/email/company |
| `/contacts/create`, `/contacts` | GET, POST | yes | Create contact |
| `/contacts/{id}` | GET | yes | Contact detail with its deals |
| `/contacts/{id}/edit`, `/contacts/{id}` | GET, PUT | yes | Edit contact |
| `/contacts/{id}` | DELETE | yes | Delete contact (cascades to deals) |
| `/deals` | GET | yes | Paginated list, `?stage=lead|qualified|won|lost` filter |
| `/deals/create`, `/deals` | GET, POST | yes | Create deal (`?contact_id=` preselects a contact) |
| `/deals/{id}` | GET | yes | Deal detail |
| `/deals/{id}/edit`, `/deals/{id}` | GET, PUT | yes | Edit deal |
| `/deals/{id}` | DELETE | yes | Delete deal |
| `/admin/users` | GET | **admin** | User list (rep → 403) |
| `/admin/users/{id}/role` | PATCH | **admin** | Toggle a user between `rep` and `admin` (not yourself) |

Guests hitting protected routes are redirected to `/login` and sent back to the intended page after signing in.

## Data / persistence

SQLite file at `DB_DATABASE` — `/data/database.sqlite` in the image (declare `-v <volume>:/data`), `database/database.sqlite` locally. Tables: `users` (with `role`), `contacts`, `deals` (+ Laravel's cache/jobs/sessions tables). The seeder creates 2 users, 20 contacts (Faker) and 15 deals spread over the four stages, and is skipped when a user already exists. `.gitignore` excludes `vendor/`, `.env`, `database/*.sqlite` and `storage/logs`.

## Verification performed

Run on macOS through Docker (no local PHP/Composer):

- Scaffolded with `composer:2` (`composer create-project laravel/laravel`), pinned `config.platform.php=8.3.33` and re-resolved the lockfile so it installs on `php:8.3-cli`.
- `php -l` on every PHP file under `app/`, `bootstrap/`, `config/`, `database/`, `routes/`, `public/` inside `php:8.3-cli` — no syntax errors.
- `docker build` (multi-stage) and `docker run -p 8007:8007 -v halka-data:/data -e APP_KEY=...`; container became healthy in ~4 s. Entrypoint log shows the SQLite file created, migrations run, seeder output "seeded 2 users, 20 contacts, 15 deals", caches built.
- `GET /healthz` → 200 JSON `{"status":"ok","db":"ok","laravel":"13.31.0","php":"8.3.33"}` and **no `Set-Cookie` header**.
- Anonymous: `/` → 302 `/login`, `/login` → 200, `/dashboard` and `/admin/users` → 302 `/login`, `/nope` → 404, `POST /login` without `_token` → 419.
- Admin login via curl cookie jar with `_token` scraped from the form → 302 `/dashboard`; then dashboard, contacts (list/search/page 2/create/show/edit), deals (list/stage filter/create/show/edit) and `/admin/users` all 200.
- CRUD: create contact → 302 to its page; duplicate email → 302 back with errors; update (PUT) → 302; create deal for that contact → 302 and it appears on the contact page; delete contact → 302 and its page → 404. Toggle a user's role (PATCH) → 302 with flash "is now admin", toggled back.
- Rep login → dashboard/contacts 200, `/admin/users` → **403**, `PATCH /admin/users/1/role` → **403**.
- Wrong password → 302 back to `/login`. Logout → 302 and `/dashboard` afterwards → 302 `/login`.
- Restarted the container with the same volume: "Nothing to migrate" + "database already seeded, skipping", `/healthz` 200.
- Container and volume removed; `vendor/` deleted after verification (lockfile kept).

Not verified: rendering in a real browser (curl only), `php artisan test` (the scaffold's example tests were not adapted), the `database` session driver, running under php-fpm/nginx instead of `artisan serve`, and a local (non-Docker) run since PHP is not installed on this machine.
