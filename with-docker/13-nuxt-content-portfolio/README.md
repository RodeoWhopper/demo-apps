# Mara Yılmaz — Product Designer (Nuxt Content portfolio)

A personal portfolio and blog for a fictional product designer. All content lives as markdown in `content/` and is queried through **@nuxt/content v3** collections; the site is **fully statically generated** with `nuxt generate`, so the deployable artefact is a folder of HTML/JSON/JS in `.output/public`. What makes it distinctive for deployment: it is a Nuxt app that must **not** be run as a Node server in production — there is no SSR process, no SPA fallback, and the RSS feed is a Nitro server route that is pre-rendered into a real `rss.xml` file at build time. Client-side navigation uses a SQLite dump loaded via WASM from `/__nuxt_content/`, so that directory must be served as static files too.

## Stack
- Nuxt 3.21.11 (Vue 3.5.42, vue-router 4.6.4), TypeScript 5.9.3, strict mode
- @nuxt/content 3.16.0 with `experimental.nativeSqlite` (uses Node's built-in `node:sqlite`, so no native addon compile)
- `scripts/postgenerate.mjs` (runs as part of `npm run generate`) copies the pre-rendered `/not-found` page over `404.html`
- Plain CSS with custom properties; dark/light toggle (persisted in `localStorage`, applied pre-paint by an inline head script)
- `serve` 14.2.6 (devDependency) for local preview of the generated output
- Docker: multi-stage `node:22-alpine` build → `nginx:1.27-alpine`

## Ports
| Port | Purpose |
|------|---------|
| 3013 | Static preview (`npm run preview` / nginx in Docker); also the dev server port |

## Quick start (local)
```sh
cd 13-nuxt-content-portfolio
npm ci                 # Node >= 22.12 required (node:sqlite)
npm run generate       # writes .output/public
npm run preview        # serve .output/public -l 3013  → http://localhost:3013
# development with HMR:
npm run dev            # http://localhost:3013
```

## Docker
```sh
docker build -t mara-portfolio .
docker run --rm -p 3013:3013 mara-portfolio
curl -i http://localhost:3013/            # 200
curl -i http://localhost:3013/rss.xml     # 200, application/rss+xml
curl -i http://localhost:3013/nope        # 404 with pre-rendered 404.html
```
The nginx config (`nginx.conf`) uses `try_files $uri $uri/index.html $uri.html =404` with `error_page 404 /404.html` — deliberately **no** SPA rewrite to `index.html`.

## Environment variables
None. The app reads no environment variables at build or run time, so there is no `.env.example`.

| name | required | default | description |
|------|----------|---------|-------------|
| — | — | — | none |

## Default credentials
None — no authentication (auth model `none`).

## Routes
| path | method | auth required? | description |
|------|--------|----------------|-------------|
| `/` | GET | no | Home: hero from `content/index.md`, featured work, recent posts (health check target) |
| `/work` | GET | no | All case studies |
| `/work/:slug` | GET | no | Case study page (4 pre-rendered) |
| `/blog` | GET | no | Post list; `?tag=<tag>` filters client-side (linkable) |
| `/blog/:slug` | GET | no | Blog post (5 pre-rendered) |
| `/about` | GET | no | About page from `content/about.md` |
| `/rss.xml` | GET | no | RSS 2.0 feed, pre-rendered from a Nitro route |
| `/404.html` | GET | no | Server-rendered not-found page for unknown paths (copied from the pre-rendered `/not-found` route by `scripts/postgenerate.mjs`, because Nuxt emits `404.html` as a client-only shell) |
| `/not-found` | GET | no | Source route for `404.html` (returns 200 when visited directly) |
| `/_nuxt/*`, `/__nuxt_content/*` | GET | no | Build assets and content SQLite dump (must be served statically) |

## Data / persistence
No runtime persistence. Source of truth is markdown in `content/` (`index.md`, `about.md`, `work/*.md`, `blog/*.md`) validated by the schemas in `content.config.ts`. At build time it is compiled into a SQLite dump shipped as static files. Theme preference is stored in the visitor's `localStorage` only.

## Verification performed
- `npm install` on Node 26.5 / npm 11.17 (lockfile `package-lock.json` committed) — OK, `nuxt prepare` ran on postinstall.
- `npm run generate` — completed; `.output/public` contains `index.html`, `work/*/index.html` (4), `blog/*/index.html` (5), `about/index.html`, `rss.xml`, `404.html` (server-rendered not-found page after the postgenerate step), `200.html`, `_nuxt/`, `__nuxt_content/`.
- `npx serve .output/public -l 3013` then `curl` of `/`, `/work`, `/work/harbor-logistics-dashboard`, `/blog`, `/blog/design-tokens-are-a-contract`, `/about`, `/rss.xml` → all `200`; `/rss.xml` body starts with `<?xml` and contains 5 `<item>` entries; `/does-not-exist` → `404` and the body contains the not-found page text.
- `docker build -t mara-portfolio .` and `docker run -p 3013:3013` → `curl /`, `/blog`, `/rss.xml` → 200 (`Content-Type: application/rss+xml`), `/nope` → 404 with the custom page. Container stopped and image removed.
- All servers were stopped; `node_modules`, `.nuxt`, `.output` were deleted afterwards (lockfile kept).
- Browser check (Chromium) against the `serve` preview: home page renders and hydrates; clicking the theme toggle switches to dark mode and persists `theme=dark` in `localStorage`; `/blog?tag=tokens` shows "Showing 2 posts tagged #tokens" with the two expected posts.
- NOT verified: `npm run typecheck` (vue-tsc) was not run; mobile-menu behaviour and HTML5 drag interactions were not exercised; RSS feed was checked for well-formed XML and item count only (not against a feed validator).
