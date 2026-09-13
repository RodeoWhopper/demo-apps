# Demo Apps Control Panel

A small local operator UI for the Docker variants of the demo apps in this repository (`with-docker/`). One page lists every app with its live
status; from there you build and start it, stop it, restart it, run its one-shot setup script (CMSs), open
its URL, read its logs, inspect credentials/routes/env, or wipe its data volumes. Everything goes through
`docker compose`, and every job streams its output live into the page via Server-Sent Events.

It is **not** one of the demo apps; it is the tool you use to run them.

## Stack
- Node.js 22 (works on 20+), Express 4.22
- Vanilla HTML/CSS/JS front end, no build step (`marked` from a CDN renders READMEs; falls back to plain text offline)
- Docker CLI with the Compose plugin (v2.20+ — top-level `name:` and `env_file.required` are used)

## Ports
- 8000 — panel UI + API (change with `PORT`)

## Quick start (local)

```bash
cd control-panel && npm install && npm start
```

Open http://localhost:8000. The first **Start** of an app builds its image, so expect a few minutes for the
heavy ones (Strapi, Spring Boot, .NET, Laravel); later starts reuse the Docker layer cache.

## How apps are run

| App type | Runner | Compose project name |
|----------|--------|----------------------|
| Has its own `docker-compose.yml` (08, 09, 10, 11, 15) | `docker compose -f <app>/docker-compose.yml …` with the app folder as cwd | Compose default = folder name, so the apps' own `setup.sh` / `scripts/*.sh` keep working |
| Has only a `Dockerfile` (the other 15) | `docker compose -f stacks/<folder>.yml …` — a generated one-service stack: build context, host port, demo env, named `data` volume | `name:` inside the stack file = folder name |

The panel copies `.env.example` to `.env` for compose-native apps the first time they start (demo values),
because their compose files and setup scripts read it.

| Button | Command |
|--------|---------|
| Start | `docker compose up -d --build --remove-orphans` |
| Stop | `docker compose down --remove-orphans` (containers removed, volumes kept) |
| Restart | `docker compose up -d --force-recreate` |
| Setup | the app's post-start script (see `catalog.json`), run with the app folder as cwd |
| Rebuild without cache | `docker compose build --no-cache` then `up -d` |
| Reset | `docker compose down -v --remove-orphans` — **deletes the app's data volumes** (confirmation required) |
| Logs | `docker compose logs --no-color --tail 300` |
| Start all / Stop all | the same, queued for every app currently visible in the filter |

Start/rebuild jobs are limited to `BUILD_CONCURRENCY` (default 2) at a time; stop jobs run immediately.
One job per app at a time.

## Status model

Every `POLL_INTERVAL_MS` the panel lists compose-managed containers (`docker ps -a`) and probes each app's
health endpoint from `deploy.json` (`http://127.0.0.1:<port><healthcheck.path>`):

| Status | Meaning |
|--------|---------|
| stopped | no containers for the project |
| starting / building / stopping / … | a job is running |
| booting | containers are up but the health probe is not yet green (up to 4 min grace) |
| running | all containers running and the health probe returned the expected status |
| unhealthy | containers up for more than 4 min but the probe still fails |
| error / exited | some or all containers stopped on their own — check Logs |

## Docker

The panel can also run in a container, but it must talk to the host daemon and the repo must be mounted
at the **same absolute path** as on the host (the daemon resolves build contexts):

```bash
docker build -t demo-apps/control-panel .
docker run -d --name demo-control-panel -p 8000:8000 \
  -e HOST=0.0.0.0 -e PANEL_TOKEN=change-me -e DEMO_APPS_ROOT="$(cd ../with-docker && pwd)" \
  -v /var/run/docker.sock:/var/run/docker.sock -v "$(cd .. && pwd):$(cd .. && pwd)" \
  demo-apps/control-panel
```

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `PORT` | no | `8000` | Panel port |
| `HOST` | no | `127.0.0.1` | Bind address. The panel runs docker commands — only bind to `0.0.0.0` together with `PANEL_TOKEN` |
| `PANEL_TOKEN` | no | — | When set, every `/api` request needs it (`x-panel-token` header or `?token=`); the UI prompts once and remembers it |
| `DEMO_APPS_ROOT` | no | `../with-docker` | Where the `NN-*` folders with Dockerfiles live |
| `BUILD_CONCURRENCY` | no | `2` | Parallel start/rebuild jobs |
| `POLL_INTERVAL_MS` | no | `4000` | Polling interval |
| `PUBLIC_HOST` | no | `localhost` | Host used in the Open links |

## Default credentials
None for the panel itself. Each app's demo users are shown under **Details** (with copy buttons).

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/` | GET | – | UI |
| `/healthz` | GET | – | `{status:"ok"}` |
| `/api/state` | GET | token* | apps with live status, jobs, docker version |
| `/api/events` | GET | token* | SSE stream: `apps`, `jobs`, `job`, `log` events |
| `/api/apps/:folder/:action` | POST | token* | `start`, `stop`, `restart`, `rebuild`, `reset`, `setup` → `202 {job}` |
| `/api/all/start`, `/api/all/stop` | POST | token* | body `{folders?: []}`; queues jobs for many apps |
| `/api/apps/:folder/logs?tail=` | GET | token* | plain-text compose logs |
| `/api/apps/:folder/readme` | GET | token* | raw README markdown |
| `/api/jobs`, `/api/jobs/:id` | GET | token* | job list / job with output lines |
| `/api/reload` | POST | token* | rescan the app folders |

\* only when `PANEL_TOKEN` is set.

## Data / persistence
The panel keeps nothing on disk. Job history lives in memory (last 40 jobs). App data lives in the apps'
own named Docker volumes and survives Stop; Reset deletes it.

## Files
- `server.js` — Express API + SSE
- `lib/catalog.js` — scans `../with-docker/NN-*/deploy.json`, merges `catalog.json` extras (setup scripts)
- `lib/status.js` — docker + health poller
- `lib/actions.js` — the compose commands behind each button
- `stacks/*.yml` — generated compose files for Dockerfile-only apps (edit env/ports there)
- `public/` — the UI

## Verification performed
Run locally on macOS with Node 26 / Docker 29.6 (2026-09-11):
- `npm install`, `node --check` on every module, `npm start`; `/healthz` 200; `/api/state` listed all 20 apps with the right runner (15 stack files, 5 compose-native, 4 with setup scripts). All 15 generated stack files pass `docker compose config`.
- API: `POST /api/apps/01-static-landing/start` and `.../16-go-gin-url-shortener/start` built the images and both apps reached `running` (health 200 in 3-4 ms); a duplicate start returned 409; `stop` removed the containers and status went back to `stopped`.
- UI (Chromium): cards, counters, filters render; clicking **Stop** on #01 queued a job, streamed the `docker compose down` output into the Activity pane, flipped the card to Stopped and showed a toast; **Details** shows credentials/routes/env; **Logs** and **README** open in the dialog.
- Compose-native path: `start` on 08-wordpress-docker created `.env` from `.env.example`, pulled/started db + wordpress (status `booting`, probe 302 until installed), **Setup** ran `./setup.sh` to completion in ~70 s, the site, `/wp-login.php` and the health route returned 200 and the panel switched to `running`; **Reset** (`down -v`) removed containers and volumes.
- Not verified: running the panel itself inside Docker, `PANEL_TOKEN` behind a reverse proxy, Start all with 20 apps at once (only the queueing logic was exercised), Rebuild without cache.
