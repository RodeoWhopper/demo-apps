# Çınar Mimarlık — WordPress on Docker

Marketing site for **Çınar Mimarlık**, a fictional İzmir architecture studio, built as a classic (non-block) WordPress theme with a `project` custom post type and a `project_type` taxonomy. What makes this app different from the other demos: it is a *stock* WordPress installation driven entirely by the official Docker images — the only source-controlled code is a theme and a must-use plugin that are bind-mounted into the container, and provisioning (core install, admin user, pages, sample projects, menu) is done by an idempotent `setup.sh` that drives **wp-cli** in a sidecar container. Auth is WordPress's own cookie-based admin login (`cms-admin`); the public site needs no auth. The public domain is env-driven (`WP_HOME` / `WP_SITEURL` constants), so moving to another host never requires a database search-replace.

## Stack

- WordPress 6.x (image `wordpress:6-php8.3-apache`, resolved to WordPress 6.9.4 / PHP 8.3 at verification time)
- MariaDB 11 (image `mariadb:11`, internal network only)
- wp-cli 2.12 (image `wordpress:cli`, one-shot sidecar, compose profile `cli`)
- Custom theme `cinar` (PHP templates + one CSS file, no build step, no external fonts/CDN)
- Must-use plugin `cinar-core.php` (CPT, taxonomy, post meta, REST health route, XML-RPC disabled)
- Docker Compose v2/v5 file format

## Ports

| Port | Service | Notes |
|------|---------|-------|
| 8008 | `wordpress` (Apache) | The only published port |
| —    | `db` (MariaDB 3306) | Internal compose network only |

## Quick start (local)

There is no "bare metal" mode — the app is Docker-only. From this folder:

```bash
cp .env.example .env          # optional: setup.sh does this for you if .env is missing
./setup.sh                    # starts db + wordpress, installs core, seeds content (idempotent)
open http://localhost:8008/
```

`setup.sh` takes about 1–2 minutes on first run (image start + ~30 wp-cli invocations). Re-running it is safe: it only creates what is missing.

## Docker

```bash
docker compose up -d                       # start db + wordpress (WordPress files are copied into the volume on first start)
./setup.sh                                 # REQUIRED once after the first `up`: installs WordPress and seeds content
docker compose run --rm wpcli <args>       # any wp-cli command, e.g. `docker compose run --rm wpcli plugin list`
docker compose logs -f wordpress
docker compose down                        # keep data
docker compose down -v                     # destroy database + uploads
```

Without `setup.sh` the site answers with the WordPress install wizard at `/wp-admin/install.php` (health route returns an HTML redirect, not JSON).

### Changing the domain

Set `WP_HOME` and `WP_SITEURL` in `.env` (e.g. `https://cinar.example.com`) and `docker compose up -d` again. The values are turned into PHP constants through `WORDPRESS_CONFIG_EXTRA`, which override the `siteurl`/`home` options in the database, so no search-replace is needed. If you run `setup.sh` on a fresh database it also uses `WP_HOME` as the install URL. Put a TLS-terminating reverse proxy in front of port 8008; if it speaks plain HTTP to the container, add `if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') { $_SERVER['HTTPS'] = 'on'; }` to `WORDPRESS_CONFIG_EXTRA`.

### Persisting uploads

Media uploads land in `/var/www/html/wp-content/uploads` inside the named volume `wp_content` (project `08-wordpress-docker`, so the Docker volume is `08-wordpress-docker_wp_content`). It survives `docker compose down` and image upgrades; only `down -v` deletes it. To keep uploads on the host instead, add `- ./uploads:/var/www/html/wp-content/uploads` to the `x-wordpress-volumes` list.

### Backups

```bash
# database dump
docker compose exec db sh -c 'mariadb-dump -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' > backup.sql
# uploads / plugins volume
docker run --rm -v 08-wordpress-docker_wp_content:/data -v "$PWD":/backup alpine tar czf /backup/wp-content.tgz -C /data .
# restore uploads
docker run --rm -v 08-wordpress-docker_wp_content:/data -v "$PWD":/backup alpine sh -c 'cd /data && tar xzf /backup/wp-content.tgz'
```

## Environment variables

All read from `.env` (copy of `.env.example`); every variable has a working demo default inside `docker-compose.yml`, so the stack starts even without `.env`.

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `WORDPRESS_DB_NAME` | no | `cinar` | Database name (also creates it in MariaDB) |
| `WORDPRESS_DB_USER` | no | `cinar` | Database user |
| `WORDPRESS_DB_PASSWORD` | no | `change-me-demo-db-pass` | Database password (demo value – change it) |
| `MARIADB_ROOT_PASSWORD` | no | `change-me-demo-root-pass` | MariaDB root password (used by backups) |
| `WORDPRESS_TABLE_PREFIX` | no | `wp_` | Table prefix |
| `WP_HOME` | no | `http://localhost:8008` | Public URL of the site (scheme + host + port) |
| `WP_SITEURL` | no | `http://localhost:8008` | URL where WordPress core lives (same as `WP_HOME` here) |
| `WORDPRESS_CONFIG_EXTRA` | no | PHP defining `WP_HOME`/`WP_SITEURL` from env | Raw PHP appended to `wp-config.php` by the official image |
| `WP_ADMIN_USER` | no | `admin` | Admin account created by `setup.sh` on first install |
| `WP_ADMIN_PASSWORD` | no | `Admin123!` | Admin password (first install only) |
| `WP_ADMIN_EMAIL` | no | `admin@cinar.local` | Admin e-mail (first install only) |

## Default credentials

| Role | Username | Password | Where |
|------|----------|----------|-------|
| Administrator | `admin` | `Admin123!` | `/wp-login.php` → `/wp-admin/` |

Created by `setup.sh` (`wp core install`). Change with `docker compose run --rm wpcli user update admin --user_pass='NewPass'`.

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/` | GET | no | Front page: hero, intro, six latest projects, values |
| `/projeler/` | GET | no | Project archive (custom post type `project`) with type filter |
| `/projeler/{slug}/` | GET | no | Project detail (e.g. `/projeler/kordon-konutlari/`) |
| `/proje-turu/{slug}/` | GET | no | Projects filtered by `project_type` term (`konut`, `kultur`, `ticari`, `kentsel`) |
| `/hakkimizda/`, `/iletisim/` | GET | no | About / Contact pages |
| `/wp-json/cinar/v1/health` | GET | no | **Health check** → `{"status":"ok", ...}` (200; 503 when DB query fails) |
| `/wp-json/wp/v2/project` | GET | no | Core REST API listing of projects (read-only) |
| `/wp-login.php` | GET/POST | no (form) | Admin login form; POST `log`,`pwd`,`testcookie=1` |
| `/wp-admin/` | GET | admin cookie | Dashboard; unauthenticated requests are redirected to the login page (302) |
| `/xmlrpc.php` | POST | — | Disabled by the mu-plugin (405) |

## Data / persistence

- `db_data` named volume → MariaDB data directory.
- `wp_core` named volume → `/var/www/html` (WordPress core files + generated `wp-config.php`).
- `wp_content` named volume → `/var/www/html/wp-content` (uploads, third-party plugins, upgrade cache).
- Bind mounts (source of truth in this repo): `wp-content/themes/cinar/` and `wp-content/mu-plugins/`.
- Content itself (pages, projects, menu, options) lives in the database and is (re)created by `setup.sh` only if missing.

## Verification performed

Run on macOS with Docker 29 / Compose v5.3 (aarch64):

- `cp .env.example .env && ./setup.sh` → core installed (WordPress 6.9.4), theme activated, 3 pages, 4 projects, 4 terms, primary menu created. Second run of `./setup.sh` created nothing (idempotency confirmed).
- `curl -I http://localhost:8008/` → 200; `/projeler/`, `/projeler/kordon-konutlari/`, `/hakkimizda/`, `/iletisim/`, `/proje-turu/konut/`, `/wp-login.php`, theme CSS → 200; unknown URL → 404; `/xmlrpc.php` → 405.
- `curl http://localhost:8008/wp-json/cinar/v1/health` → 200 `{"status":"ok","site":"Çınar Mimarlık","wordpress":"6.9.4",...}`.
- `/wp-json/wp/v2/project` → 4 seeded projects.
- Login flow: GET `/wp-login.php` (test cookie) then POST credentials → 302 to `/wp-admin/`; `/wp-admin/edit.php?post_type=project` with the session cookie → 200; `/wp-admin/` without cookie → 302 to login; wrong password → login page with "incorrect" error.
- `docker compose down -v` afterwards.
- NOT verified: media upload through the admin UI, e-mail sending (no mail server; `setup.sh` uses `--skip-email`), running behind an HTTPS reverse proxy, and the compose `healthcheck` transition timing was not observed over a long period (it uses the same URL as the verified health route).
