# Demo Apps — 21 sample web applications for deployment infrastructure

A reference collection of twenty-one self-contained, intentionally *different* web applications.
Each one lives in its own numbered folder with its own fictional brand, its own stack, and its own idea
of what "login", "admin" and "routing" mean. Together they cover most shapes a deployment pipeline,
container platform or PaaS has to handle: static sites, SPAs with history-mode routing, server-rendered
MPAs, JSON APIs, multi-service monorepos, Docker Compose stacks with databases, and four off-the-shelf
CMSs. Use them to test CI/CD pipelines, build packs, reverse-proxy and TLS setups, health checks,
volume handling, or simply as starter examples for each stack.

## Two variants of every app

| Folder | What it contains | Typical use |
|--------|------------------|-------------|
| `with-docker/NN-slug/` | Full version: source, `Dockerfile` and/or `docker-compose.yml`, `deploy.json` manifest, detailed README with ports, env vars, credentials, routes and verification notes | Container platforms, Compose hosts, pipelines that read the manifest |
| `no-docker/NN-slug/` | Same application as plain source only: no Docker files, no manifest, no helper scripts beyond what the stack needs, and a one-line README | Testing how well tooling understands an undocumented repository: it has to detect the stack, ports, build and start commands from the code |

The two trees are paired by the two-digit prefix (`08-wordpress-docker` ↔ `08-wordpress`). The CMS apps
differ the most: the Docker versions pull official images, while the source versions carry WordPress core,
the Ghost release package and a Directus npm project so they run from source with only PHP or Node.

## Control panel

`control-panel/` is a local operator UI (Node + Express + Docker Compose) that builds, starts, stops,
resets and monitors the `with-docker/` variants from one page, with live job logs and one-click setup for
the CMSs. It is a tool, not one of the sample apps:

```bash
cd control-panel && npm install && npm start   # then open http://localhost:8000
```

## Layout

```
demo-apps/
├── control-panel/         # operator UI for the with-docker variants (see its README)
├── apps.json              # machine-readable index (generated from every with-docker/<app>/deploy.json)
├── scripts/
│   ├── build-index.py     # regenerate apps.json, validate manifests, check the no-docker tree (--check, --markdown)
│   └── check-clean.sh     # report node_modules / vendor / build output that should not be committed
├── with-docker/NN-<slug>/ # one folder per app
│   ├── README.md          # stack, ports, quick start, docker, env, credentials, routes, verification
│   ├── deploy.json        # deployment manifest (schema below)
│   ├── Dockerfile and/or docker-compose.yml
│   ├── .env.example       # present whenever the app reads env vars
│   └── .gitignore / .dockerignore
└── no-docker/NN-<slug>/   # the same app as plain source: code, lockfiles, .env.example, one-line README
```

## deploy.json

Every `with-docker/` app ships a `deploy.json` with the same shape, so build and deployment tooling can decide how to
build, run and probe it without reading the README first:

| Field | Meaning |
|-------|---------|
| `kind` | `static`, `ssr`, `spa`, `api`, `fullstack`, `cms`, `compose` |
| `runtime` | primary runtime + version, e.g. `node@22`, `python@3.12`, `php@8.3`, `docker` |
| `port` / `extra_ports` | main HTTP port and any secondary ports (second service, CMS admin, …) |
| `install` / `build` / `start` / `dev` | exact commands (`null` when not applicable) |
| `docker` | `{ "dockerfile": "Dockerfile" }` or `{ "compose": "docker-compose.yml" }` |
| `healthcheck` | `{ "path": "/healthz", "expect_status": 200 }` |
| `env` | list of `{ name, required, default, description }` |
| `auth` | `{ model, description }` — see the auth models below |
| `credentials` | seeded demo users (all passwords are obviously fake demo values) |
| `routes` | `public` / `authenticated` / `admin` path lists |
| `persistence` | where data lives (SQLite file, named volume, JSON file, browser storage…) |
| `notes` | anything an operator or pipeline must know (writable volumes, post-deploy scripts, origin settings) |

`python3 scripts/build-index.py` rebuilds `apps.json`, validates every manifest and checks that each
`no-docker/` sibling is free of Docker files, manifests and Docker mentions; `--check` only validates;
`--markdown` prints the table below.

## Ports

Every app uses a unique port so all of them can run on one host at the same time.
The plan is in each `deploy.json`; the table below lists them.

## Auth models covered

| Model | Apps | Where the session lives |
|-------|------|-------------------------|
| `none` | 01, 13, 14 | static, no auth at all |
| `client-mock` | 19 | fake token in `localStorage`, router guards only (no backend) |
| `jwt-cookie` | 02 | signed JWT in an httpOnly cookie, checked in Next.js middleware |
| `bearer-jwt` | 04, 15, 21 | `Authorization: Bearer` access + refresh tokens (Flask), OAuth2 password flow (FastAPI), access token + rotating httpOnly refresh cookie (.NET Minimal API) |
| `server-session` | 03, 05, 06, 07, 12, 17, 18 | Django, express-session, PHP `$_SESSION`, Laravel guard, SvelteKit hooks, Spring Security, ASP.NET Identity |
| `http-basic` | 16 | `WWW-Authenticate: Basic` on the admin area only |
| `otp-passwordless` | 20 | 6-digit e-mail code (printed to the log), HMAC-signed cookie |
| `cms-admin` | 08, 09, 10, 11 | the CMS's own admin (WordPress, Strapi, Ghost, Directus) |

## Routing models covered

File-system routing (Next.js App Router, SvelteKit route groups, Nuxt, Astro/Starlight, Razor Pages
folder conventions), URL conf + decorators (Django, Flask blueprints, FastAPI routers), hand-written
front-controller router (vanilla PHP), Laravel resource routes, Gin route groups, Spring `@RequestMapping`,
.NET Minimal API endpoint groups with SPA fallback (React build served by the API itself),
client-side HTML5 history routing that needs a server rewrite (Vue SPA, React SPA), HTMX partial routes
(Bun/Elysia), and CMS-managed routing (WordPress permalinks, Ghost `routes.yaml`, Strapi/Directus REST).

## Deployment scenarios each app exercises

- Static hosting with custom 404 and cache headers (01, 13, 14) versus SPA fallback to `index.html` (19, 15 web).
- Single-binary and single-container services (16 Go, 17 JVM jar, 18 and 21 .NET, 20 Bun).
- Node SSR servers that need a writable data directory and correct `ORIGIN`/cookie settings (02, 05, 12).
- Python WSGI/ASGI apps with migrations and seeding at start-up (03, 04, 15 api).
- PHP behind Apache or the built-in server, with and without Composer (06, 07).
- Multi-service Compose stacks with databases, named volumes and one-shot setup scripts (08, 09, 10, 11, 15).
- WebSocket traffic that a reverse proxy must upgrade (21 SignalR), rate limiting behind proxies (21),
  and CSRF/origin checks that break when the public URL is misconfigured (07, 12, 17).

## Conventions every with-docker app follows

- Health endpoint on every server app (`/healthz`, `/api/health`, `/actuator/health`, `/server/health`, …); static sites use `/`.
- Seed data + demo users are created automatically on first start (or by a documented one-shot script for the CMSs).
- All demo secrets are placeholders such as `change-me-demo-secret`; replace them in production.
- Version-pinned dependencies with lockfiles committed. Generated artefacts (`node_modules`, `vendor`, `target`, `bin/obj`, `dist`, `.next`, …) are **not** committed — run the `install`/`build` commands from `deploy.json`.
- Each README ends with a **Verification performed** section that states exactly what was tested and what was not.

## Apps

| # | Title | Kind | Stack | Port(s) | Auth model | With Docker | Without Docker |
|---|-------|------|-------|---------|------------|-------------|----------------|
| 01 | Nordwind Coffee Roasters — static landing page | static | html, css, javascript, nginx | 8081 | `none` | [`with-docker/01-static-landing`](with-docker/01-static-landing/) | [`no-docker/01-static-landing`](no-docker/01-static-landing/) |
| 02 | Lumeo Analytics – SaaS dashboard (Next.js 15) | ssr | node, nextjs, react, typescript, tailwindcss, jose, bcryptjs | 3002 | `jwt-cookie` | [`with-docker/02-nextjs-saas-dashboard`](with-docker/02-nextjs-saas-dashboard/) | [`no-docker/02-nextjs-saas-dashboard`](no-docker/02-nextjs-saas-dashboard/) |
| 03 | Pergament - Django long-form blog with admin backoffice | cms | python, django, sqlite, gunicorn, whitenoise | 8003 | `server-session` | [`with-docker/03-django-blog-admin`](with-docker/03-django-blog-admin/) | [`no-docker/03-django-blog-admin`](no-docker/03-django-blog-admin/) |
| 04 | Scribble API - Flask JSON notes API with Bearer JWT | api | python, flask, sqlalchemy, sqlite, pyjwt, gunicorn, openapi | 5004 | `bearer-jwt` | [`with-docker/04-flask-jwt-notes-api`](with-docker/04-flask-jwt-notes-api/) | [`no-docker/04-flask-jwt-notes-api`](no-docker/04-flask-jwt-notes-api/) |
| 05 | Depot Ninety – warehouse inventory (Express 4 + EJS) | ssr | node, express, ejs, express-session, lowdb, bcryptjs, tailwindcss-cdn | 3005 | `server-session` | [`with-docker/05-express-ejs-inventory`](with-docker/05-express-ejs-inventory/) | [`no-docker/05-express-ejs-inventory`](no-docker/05-express-ejs-inventory/) |
| 06 | Bakkal Panel - small-shop product & order admin | ssr | php, apache, sqlite, tailwind-cdn | 8006 | `server-session` | [`with-docker/06-php-vanilla-admin`](with-docker/06-php-vanilla-admin/) | [`no-docker/06-php-vanilla-admin`](no-docker/06-php-vanilla-admin/) |
| 07 | Halka CRM - contacts & deals pipeline | fullstack | php, laravel, blade, sqlite, tailwind-cdn | 8007 | `server-session` | [`with-docker/07-laravel-crm`](with-docker/07-laravel-crm/) | [`no-docker/07-laravel-crm`](no-docker/07-laravel-crm/) |
| 08 | Çınar Mimarlık — WordPress studio site | cms | docker, wordpress, php, mariadb, wp-cli | 8008 | `cms-admin` | [`with-docker/08-wordpress-docker`](with-docker/08-wordpress-docker/) | [`no-docker/08-wordpress`](no-docker/08-wordpress/) |
| 09 | Tarla Journal — Strapi 5 headless CMS + static frontend | cms | node, strapi, typescript, sqlite, nginx, docker | 1337, 8009 | `cms-admin` | [`with-docker/09-strapi-headless-cms`](with-docker/09-strapi-headless-cms/) | [`no-docker/09-strapi-headless-cms`](no-docker/09-strapi-headless-cms/) |
| 10 | Sığınak — Ghost 5 newsletter | cms | docker, ghost, node, handlebars, mysql | 8010 | `cms-admin` | [`with-docker/10-ghost-docker`](with-docker/10-ghost-docker/) | [`no-docker/10-ghost`](no-docker/10-ghost/) |
| 11 | Kılavuz Etkinlik — Directus 11 events directory | cms | docker, directus, node, postgres, nginx | 8011, 8111 | `cms-admin` | [`with-docker/11-directus-docker`](with-docker/11-directus-docker/) | [`no-docker/11-directus`](no-docker/11-directus/) |
| 12 | Terracotta Supply – plant-pot shop (SvelteKit 2 + Svelte 5) | ssr | node, sveltekit, svelte, typescript, vite, adapter-node, bcryptjs | 3012 | `server-session` | [`with-docker/12-sveltekit-shop`](with-docker/12-sveltekit-shop/) | [`no-docker/12-sveltekit-shop`](no-docker/12-sveltekit-shop/) |
| 13 | Mara Yılmaz — Product Designer portfolio & blog | static | node, nuxt, nuxt-content, vue, typescript, nginx | 3013 | `none` | [`with-docker/13-nuxt-content-portfolio`](with-docker/13-nuxt-content-portfolio/) | [`no-docker/13-nuxt-content-portfolio`](no-docker/13-nuxt-content-portfolio/) |
| 14 | Kestrel CLI — developer documentation | static | node, astro, starlight, typescript, pagefind, nginx | 4314 | `none` | [`with-docker/14-astro-starlight-docs`](with-docker/14-astro-starlight-docs/) | [`no-docker/14-astro-starlight-docs`](no-docker/14-astro-starlight-docs/) |
| 15 | Orbit Tasks - FastAPI API + React SPA monorepo (two services) | compose | python, fastapi, sqlalchemy, sqlite, uvicorn, node, react, vite, typescript, react-router, tailwind, nginx, docker-compose | 5015, 8015 | `bearer-jwt` | [`with-docker/15-fastapi-react-tasks`](with-docker/15-fastapi-react-tasks/) | [`no-docker/15-fastapi-react-tasks`](no-docker/15-fastapi-react-tasks/) |
| 16 | Kısa.link – URL Shortener | fullstack | go, gin, sqlite, html-template, tailwind | 8016 | `http-basic` | [`with-docker/16-go-gin-url-shortener`](with-docker/16-go-gin-url-shortener/) | [`no-docker/16-go-gin-url-shortener`](no-docker/16-go-gin-url-shortener/) |
| 17 | Kütüphane Plus – Library Lending System | ssr | java, spring-boot, spring-security, thymeleaf, spring-data-jpa, h2, maven | 8017 | `server-session` | [`with-docker/17-spring-boot-library`](with-docker/17-spring-boot-library/) | [`no-docker/17-spring-boot-library`](no-docker/17-spring-boot-library/) |
| 18 | Masaüstü Destek – IT Helpdesk Ticketing | ssr | dotnet, aspnet-core, razor-pages, identity, ef-core, sqlite | 8018 | `server-session` | [`with-docker/18-dotnet-razor-helpdesk`](with-docker/18-dotnet-razor-helpdesk/) | [`no-docker/18-dotnet-razor-helpdesk`](no-docker/18-dotnet-razor-helpdesk/) |
| 19 | Flowboard — Vue 3 kanban SPA | spa | node, vue, vite, vue-router, pinia, tailwindcss, typescript, nginx | 8019, 5019 | `client-mock` | [`with-docker/19-vue-spa-kanban`](with-docker/19-vue-spa-kanban/) | [`no-docker/19-vue-spa-kanban`](no-docker/19-vue-spa-kanban/) |
| 20 | Pulsebox - live polls | ssr | bun, elysia, typescript, htmx, sqlite | 3020 | `otp-passwordless` | [`with-docker/20-bun-elysia-htmx-polls`](with-docker/20-bun-elysia-htmx-polls/) | [`no-docker/20-bun-elysia-htmx-polls`](no-docker/20-bun-elysia-htmx-polls/) |
| 21 | Ocakbaşı KDS – Restaurant Kitchen Display System | fullstack | dotnet, aspnetcore, minimal-api, signalr, efcore, sqlite, react, vite, typescript, tailwindcss | 8021 | `bearer-jwt` | [`with-docker/21-react-dotnet-kitchen-display`](with-docker/21-react-dotnet-kitchen-display/) | [`no-docker/21-react-dotnet-kitchen-display`](no-docker/21-react-dotnet-kitchen-display/) |

Regenerate this table with `python3 scripts/build-index.py --markdown`.

