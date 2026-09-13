# Bakkal Panel — vanilla PHP admin panel

Bakkal Panel is the back-office of a small neighbourhood grocery ("bakkal"): a product catalogue with stock levels, an order list with a status workflow (pending → paid → shipped / cancelled) and admin-only user management. What makes it different from the other demo apps: it is **framework-free PHP 8.3** — no Composer, no dependencies. A single front controller (`public/index.php`) feeds a ~60-line hand-written router (`src/Router.php`) that matches method + path with `{id}` placeholders and per-route middleware closures. Authentication is a **native PHP `$_SESSION` cookie** with `password_hash`/`password_verify`, a per-session CSRF token on every POST form, and two roles (`admin`, `staff`). Data lives in SQLite through PDO and is created and seeded on the first request.

## Stack

- PHP 8.3 (official `php:8.3-apache` image; also runs on the built-in `php -S` server)
- Apache 2.4 + `mod_rewrite` (Docker) — DocumentRoot is `public/`
- PDO + SQLite 3 (`pdo_sqlite`, bundled in the official image)
- Tailwind CSS via CDN (`cdn.tailwindcss.com`) — no build step
- No Composer, no npm

## Ports

| Port | What |
|------|------|
| 8006 | HTTP (Apache in Docker, or the PHP built-in server locally) |

## Quick start (local)

Requires PHP 8.3 with `pdo_sqlite` (default in most builds).

```bash
cd 06-php-vanilla-admin
cp .env.example .env            # optional; defaults work without it
php -S localhost:8006 -t public public/index.php
# open http://localhost:8006  -> redirected to /login
```

`public/index.php` doubles as the router script for the built-in server: real files under `public/` (e.g. `robots.txt`) are served directly, everything else is routed through the app. The SQLite file `data/bakkal.sqlite` is created and seeded on the first request.

## Docker

```bash
cd 06-php-vanilla-admin
docker build -t bakkal-panel .
docker run --rm -p 8006:8006 -v bakkal-data:/var/www/html/data bakkal-panel
# http://localhost:8006
```

The image is `php:8.3-apache` with `mod_rewrite` enabled, `Listen 8006`, a vhost whose DocumentRoot is `/var/www/html/public` and `AllowOverride All` so `public/.htaccess` rewrites everything to `index.php`. `data/` is owned by `www-data` and declared as a `VOLUME`; mount something there to persist the database across container restarts. Environment variables can be passed with `-e` or `--env-file .env`.

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `APP_ENV` | no | `production` | `development` shows exception traces on the 500 page; anything else hides them. |
| `APP_KEY` | no | `change-me-demo-key` | Read at boot for parity with the other demo apps; not used cryptographically. |
| `DB_PATH` | no | `data/bakkal.sqlite` (Docker: `/var/www/html/data/bakkal.sqlite`) | Path of the SQLite database file. The directory is created if missing; the file is created and seeded on first request. |

Values are read from the real environment first, then from an optional `.env` file in the project root (see `.env.example`).

## Default credentials

| Role | Username | Password |
|------|----------|----------|
| admin | `admin` | `Admin123!` |
| staff | `staff` | `Staff123!` |

`staff` can manage products and orders but gets a **403** page on `/users`.

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/healthz` | GET | no | JSON health check (`{"status":"ok","db":"ok",...}`); does not start a session |
| `/login` | GET | no | Login form (redirects to `/` when already logged in) |
| `/login` | POST | no (CSRF) | Authenticate; 422 on bad credentials |
| `/logout` | POST | yes (CSRF) | Destroy session, redirect to `/login` |
| `/` | GET | yes | Dashboard: KPI cards, recent orders, low-stock alerts |
| `/products` | GET | yes | Product list with `?q=` search |
| `/products/new` | GET | yes | New product form |
| `/products` | POST | yes (CSRF) | Create product (server-side validation, 422 on error) |
| `/products/{id}/edit` | GET | yes | Edit form |
| `/products/{id}` | POST | yes (CSRF) | Update product |
| `/products/{id}/delete` | POST | yes (CSRF) | Delete product (blocked with a flash message if referenced by an order) |
| `/orders` | GET | yes | Order list, filter with `?status=pending|paid|shipped|cancelled` |
| `/orders/{id}` | GET | yes | Order detail with line items and total |
| `/orders/{id}/status` | POST | yes (CSRF) | Change order status |
| `/users` | GET | **admin** | User list + create form (staff → 403) |
| `/users` | POST | **admin** (CSRF) | Create user |
| `/users/{id}/delete` | POST | **admin** (CSRF) | Delete user (cannot delete yourself) |

Unauthenticated requests to protected routes are redirected (302) to `/login`; the original URL is remembered and used after login. A missing/invalid CSRF token returns **403** (not 419 — Apache rewrites unknown status codes to 500). Unknown paths return 404, wrong methods 405.

## Data / persistence

SQLite file at `data/bakkal.sqlite` (override with `DB_PATH`; in Docker `/var/www/html/data/bakkal.sqlite` on the `data` volume). On the first request `src/Database.php` creates the tables (`users`, `products`, `orders`, `order_items`) and, only if `users` is empty, seeds 2 users, 10 products and 6 orders — so the seed is idempotent. WAL journal mode is enabled; the `data/` directory must be writable by the web server user. Delete the file to reset.

## Verification performed

All checks were run through Docker on macOS (no local PHP):

- `php -l` on every `.php` file inside `php:8.3-cli` — no syntax errors.
- `docker build` of the included Dockerfile, then `docker run -p 8006:8006`.
- `GET /healthz` → 200 JSON with `"db":"ok"`.
- Anonymous: `GET /` → 302 to `/login`, `GET /login` → 200, `GET /users` → 302, `GET /nope` → 404, `POST /login` without CSRF token → 403.
- Admin login with curl cookie jar + CSRF token scraped from the form → 302 to `/`; then `GET /`, `/products`, `/orders`, `/orders/1`, `/products/1/edit`, `/users` all 200.
- Product CRUD as admin: create (302 → listed), update (302), validation failure (422), delete (302 → gone), wrong CSRF token → 403.
- Order status change `POST /orders/1/status` → 302 and the detail page shows the new status.
- User creation as admin → 302 and listed.
- Staff login → `GET /products` 200, `GET /users` **403**, `POST /users` **403**.
- Wrong password → 422. `POST /logout` → 302 and subsequent `GET /products` → 302 to `/login`.
- Built-in server mode (`php -S 127.0.0.1:8006 -t public public/index.php` inside `php:8.3-cli`): `/healthz`, `/login` and a static file all served correctly.
- Container stopped afterwards; no database file is committed.

Not verified: rendering in a real browser (only curl), HTTPS/secure-cookie behaviour, running behind a reverse proxy, and multi-worker concurrency on the SQLite file.
