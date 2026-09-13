# Kısa.link – Go / Gin URL Shortener

Kısa.link ("kısa" = short in Turkish) is a self-contained URL shortener: paste a long URL, optionally choose a custom alias, and get a short link with a public statistics page and a JSON API. What makes this app distinct in the demo set: it is a **single static Go binary** (no CGO – SQLite is the pure-Go `modernc.org/sqlite` driver, templates and CSS are embedded with `embed.FS`), it uses **HTTP Basic Auth** (`gin.BasicAuth`) for the admin area instead of sessions or JWTs, and its routing mixes a catch-all `/:code` redirect route with static routes (`/healthz`, `/admin`, `/api/...`) on the same level, which Gin resolves by priority. The `POST /shorten` endpoint accepts both an HTML form and JSON, so the same route serves the UI and API clients.

## Stack

- Go 1.25 (`go.mod` directive `go 1.25.0`; toolchains ≥ 1.21 auto-download it, local build used go 1.26.5)
- Gin `github.com/gin-gonic/gin` v1.12.0
- SQLite via `modernc.org/sqlite` v1.58.0 (pure Go, `CGO_ENABLED=0`)
- Go `html/template` views embedded with `embed.FS` (`internal/web`)
- Tailwind CSS via CDN (`cdn.tailwindcss.com`) – only network dependency at runtime, page-side
- Docker: `golang:1.25-alpine` build stage → `gcr.io/distroless/static-debian12:nonroot` runtime (≈ 9.5 MB image)

## Ports

| Port | What |
|------|------|
| 8016 | HTTP (Gin) – the only port |

## Quick start (local)

```bash
cd 16-go-gin-url-shortener
go mod download
go test ./...                 # store + code generator + URL validation tests
make build                    # -> bin/kisa (static binary, CGO disabled)
./bin/kisa                    # listens on :8016, creates data/kisa.db and seeds 5 links
# or, without building:
make run                      # go run ./cmd/server
```

Open http://localhost:8016 – admin panel at http://localhost:8016/admin (`admin` / `Admin123!`).

Other Makefile targets: `make test`, `make vet`, `make tidy`, `make clean` (removes `bin/` and db files), `make docker-build`, `make docker-run`.

## Docker

```bash
docker build -t kisa-link .
docker run --rm -p 8016:8016 -v kisa-data:/data kisa-link
# with a public origin and custom admin credentials:
docker run --rm -p 8016:8016 -v kisa-data:/data \
  -e BASE_URL=https://kisa.example.com -e ADMIN_USER=ops -e ADMIN_PASS='s3cret' kisa-link
```

The image runs as the distroless `nonroot` user (uid 65532) and stores the database at `/data/kisa.db` (declared `VOLUME`). A named volume works as-is; if you bind-mount a host directory instead, make it writable by uid 65532 (`chown 65532:65532 ./data`).

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `PORT` | no | `8016` | HTTP port |
| `BASE_URL` | no | `http://localhost:<PORT>` | Public origin used to build `short_url` / `stats_url` (no trailing slash) |
| `ADMIN_USER` | no | `admin` | HTTP Basic Auth user for `/admin` |
| `ADMIN_PASS` | no | `Admin123!` | HTTP Basic Auth password for `/admin` (demo value) |
| `DB_PATH` | no | `data/kisa.db` (`/data/kisa.db` in Docker) | SQLite file; parent directory is created automatically |
| `GIN_MODE` | no | `debug` (`release` in Docker) | Gin mode: `debug`, `release` or `test` |

See `.env.example`.

## Default credentials

| Role | Username | Password | Where |
|------|----------|----------|-------|
| admin | `admin` | `Admin123!` | HTTP Basic Auth on `/admin/**` (browser prompt or `curl -u admin:'Admin123!'`) |

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/healthz` | GET | no | Health check → `{"status":"ok","db":"ok","links":N}` (200) or 503 if the DB is unreachable |
| `/` | GET | no | Landing page: shorten form, totals, 5 most recent links, API snippet |
| `/shorten` | POST | no | Create a link. Form fields or JSON body `{"url": "...", "alias": "optional"}`. JSON → `201` with link object; form → landing page with result. Errors: 400 (invalid URL/alias), 409 (alias taken) |
| `/:code` | GET | no | `302` redirect to the target and increments the click counter (`Cache-Control: no-store`); unknown code → 404 page |
| `/:code/stats` | GET | no | Public statistics page (clicks, created, last click) |
| `/api/links/:code` | GET | no | JSON representation of a link (404 JSON if missing) |
| `/static/*` | GET | no | Embedded static assets (`app.css`, `favicon.svg`) |
| `/admin` | GET | Basic Auth | All links with click counts and delete buttons |
| `/admin/links/:code/delete` | POST | Basic Auth | Delete a link, redirects (303) back to `/admin` |
| `/admin/export.csv` | GET | Basic Auth | CSV export of all links |

Custom aliases: 3–32 chars of `[A-Za-z0-9_-]`; the words `admin`, `api`, `healthz`, `shorten`, `static`, `stats`, `login`, `logout`, `favicon.ico`, `robots.txt` are reserved. Generated codes are 7 characters from an alphabet without look-alike characters. URLs without a scheme get `https://` prepended; only `http`/`https` targets are accepted.

## Data / persistence

- SQLite database at `DB_PATH` (default `data/kisa.db`, WAL mode → `kisa.db-wal` / `kisa.db-shm` side files). In Docker: `/data/kisa.db` on the `/data` volume.
- Schema migrations (`schema_migrations` table) run at startup; migrations are idempotent, so restarts are safe.
- If the `links` table is empty, 5 demo links are seeded (`/go`, `/gin`, `/sqlite`, `/tailwind`, `/docker`).
- Graceful shutdown on SIGINT/SIGTERM (10 s drain).

## Verification performed

Run on macOS with Go 1.26.5 (`GOTOOLCHAIN=local`) and Docker 29.6.2 on 2026-09-10:

- `go mod tidy` – clean; `gofmt -l .` – clean; `go vet ./...` – OK.
- `go test ./...` – 3 test files, all pass (`internal/store`: code generator, alias validation, create/get/resolve/click counting, unique alias, delete/list/stats, seed idempotence, reopen after migrations; `internal/handlers`: URL normalisation).
- `CGO_ENABLED=0 go build -o bin/kisa ./cmd/server` – OK; started `./bin/kisa` on :8016 (seeded 5 links) and verified with curl:
  - `GET /healthz` → 200 `{"db":"ok","links":5,"status":"ok"}`; `GET /` → 200 HTML (also rendered in a browser).
  - `POST /shorten` JSON with alias → 201; without alias → 201 with generated 7-char code; form POST → 200 page with the new short URL.
  - `GET /goblog` → 302 `Location: https://go.dev/blog`; after 3 hits `GET /api/links/goblog` reports `"clicks":3` and `GET /goblog/stats` → 200 showing 3.
  - Validation: `javascript:` URL → 400, reserved alias → 400, duplicate alias → 409, invalid form → 400 HTML.
  - `GET /admin` without auth → 401 with `WWW-Authenticate: Basic`; wrong password → 401; `-u admin:Admin123!` → 200; `GET /admin/export.csv` → 200 CSV with `Content-Disposition`; `POST /admin/links/twdocs/delete` → 303 and the code then returns 404.
  - Unknown code → 404 HTML, `/api/links/nope` → 404 JSON; `/static/app.css` and `/static/favicon.svg` → 200.
  - `kill -TERM` → log shows "shutdown signal received … server stopped".
- `docker build` → OK (9.5 MB image, `USER nonroot`, `EXPOSE 8016`, `VOLUME /data`); `docker run -p 8016:8016 -v kisa-verify-data:/data` → `/healthz` 200, JSON shorten 201, redirect 302, admin 401/200; container restarted with the same volume and the created link was still there.
- Not verified: running behind a reverse proxy / non-localhost `BASE_URL`, and bind-mount permissions on a Linux host (only a named volume was tested).
- Build artefacts (`bin/`, `data/*.db*`, verification image/volume) were removed afterwards.
