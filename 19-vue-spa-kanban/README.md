# Flowboard — Vue 3 kanban SPA

Flowboard is a kanban board that runs entirely in the browser: columns, cards, native HTML5 drag & drop, a deep-linkable card modal (`/board/:cardId`) and a **mock sign-in with role-guarded routes**. It is built as a classic **single-page application** with **Vue Router in HTML5 history mode**, which is the deployment gotcha this app exists to exercise: the host must rewrite every unknown path to `index.html` (status 200) or deep links and refreshes break. The repo ships that rewrite in three flavours — `nginx.conf`, `public/_redirects` (Netlify) and `vercel.json` — so every common hosting setup is covered. There is **no backend**: auth and board data are mocked client-side and persisted in `localStorage`.

## Stack
- Vue 3.5.42 + TypeScript 5.9.3 (`<script setup>`, strict)
- Vite 6.4.3 (`@vitejs/plugin-vue` 6.0.8), `vue-tsc` 3.3.11 for type-checking in `npm run build`
- Vue Router 4.6.4 — `createWebHistory`, nested modal route, `beforeEach` guards
- Pinia 3.0.4 — `auth` and `board` stores, both persisted to `localStorage`
- Tailwind CSS 4.3.3 via `@tailwindcss/vite`
- Docker: multi-stage `node:22-alpine` build → `nginx:1.27-alpine`

## Ports
| Port | Purpose |
|------|---------|
| 8019 | Production: nginx in Docker, or `vite preview` serving `dist/` |
| 5019 | Vite dev server only (`npm run dev`) |

## Quick start (local)
```sh
cd 19-vue-spa-kanban
npm ci
npm run build            # vue-tsc --noEmit && vite build  → dist/
npm run preview          # http://localhost:8019  (vite preview already does the SPA fallback)
# development with HMR:
npm run dev              # http://localhost:5019
```

## Docker
```sh
docker build -t flowboard .
docker run --rm -p 8019:8019 flowboard
curl -i http://localhost:8019/            # 200 index.html
curl -i http://localhost:8019/board       # 200 index.html (try_files fallback)
curl -i http://localhost:8019/board/c-3   # 200 index.html
```
`nginx.conf` contains the essential line for history mode:
```nginx
location / { try_files $uri $uri/ /index.html; }
```
Other hosts: `public/_redirects` (`/* /index.html 200`) is copied into `dist/` for Netlify; `vercel.json` has the equivalent `rewrites` entry.

## Environment variables
None. The app reads no environment variables (no `VITE_*` values), so there is no `.env.example`. `import.meta.env.BASE_URL` is Vite's default `/`.

| name | required | default | description |
|------|----------|---------|-------------|
| — | — | — | none |

## Default credentials
Client-side mock only (`src/mocks/users.ts`). Both are also listed on the sign-in page with a click-to-fill button.

| role | email | password |
|------|-------|----------|
| admin | `ana@flowboard.app` | `Ana123!` |
| member | `leo@flowboard.app` | `Leo123!` |

## Routes
All routes are served by the same `index.html`; "auth required" is enforced by router guards in `src/router/index.ts`, not by the server.

| path | method | auth required? | description |
|------|--------|----------------|-------------|
| `/` | GET | no | Landing page (health check target) |
| `/login` | GET | no | Sign-in form; honours `?redirect=/path` and `?reason=admin` |
| `/api-mock` | GET | no | Page explaining that there is no backend and how auth/data are mocked |
| `/board` | GET | yes | Kanban board: add/rename/delete columns, add cards, drag & drop |
| `/board/:cardId` | GET | yes | Card editor as a modal route on top of the board (deep-linkable, e.g. `/board/c-3`) |
| `/settings` | GET | yes | Display name, mock token, JSON export, sign out |
| `/admin` | GET | yes, role `admin` | Members table, board stats, **Reset board** |
| `/*` (anything else) | GET | no | Client-side 404 view (server returns 200 + `index.html`) |

Guard behaviour: unauthenticated → `/login?redirect=<path>`; authenticated member opening `/admin` → `/login?redirect=/admin&reason=admin`; authenticated user opening `/login` → `/board`.

## Data / persistence
Browser `localStorage` only: `flowboard.auth` (session) and `flowboard.board` (columns + cards). Each browser has its own board; "Reset board" on `/admin` restores the seed. No files, no database, no volumes.

## Verification performed
- `npm install` on Node 26.5 / npm 11.17 (lockfile committed) — OK.
- `npm run build` — `vue-tsc --noEmit` passed with no type errors, then `vite build` produced `dist/` (`index.html`, `assets/*`, `_redirects`, `favicon.svg`).
- `npm run preview` (port 8019): `curl` `/` → 200; `/board` → 200 with `index.html` body; `/board/c-3` → 200; `/admin` → 200; `/no-such-page` → 200 (SPA shell, client renders 404 view).
- Browser check (Chromium) of the preview: `/board` unauthenticated redirected to `/login?redirect=/board`; signing in as `ana@flowboard.app` (click-to-fill + submit) landed on `/board` with the 4 seeded columns and 6 cards; deep link `/board/c-3` opened the card modal for "Keyboard shortcuts for moving cards"; `/admin` rendered the members table; Sign out cleared `localStorage["flowboard.auth"]`; signing in as `leo@flowboard.app` (form filled via script) landed on `/board` with role `member`, and opening `/admin` redirected to `/login?redirect=/admin&reason=admin` with the "Admin access required" banner; `/no-such-page` rendered the client-side 404 view.
- Drag & drop: the DnD handlers were exercised by dispatching `dragstart`/`dragover`/`drop`/`dragend` `DragEvent`s with a `DataTransfer` from the browser console — card `c-1` moved from "Backlog" to "Done", the DOM updated, `localStorage["flowboard.board"]` reflected the move, and it survived navigating away and back. A real pointer drag via browser automation only fired `dragstart` (Chromium's synthesized mouse events do not complete native HTML5 drags), so mouse-driven DnD was NOT verified end-to-end and should be tried by hand.
- `npm run dev` bound to port 5019 (`curl /` and `/board` → 200) and was stopped.
- `docker build -t flowboard .` and `docker run -p 8019:8019`: `curl` `/` → 200, `/board` → 200 (`index.html` via `try_files`), `/board/c-3` → 200, `/admin` → 200, `/no-such-page` → 200 (SPA shell), `/assets/index-<hash>.js` → 200 with `Cache-Control: max-age=31536000`, `/assets/nope.js` → 404. Container stopped, image removed.
- All servers stopped; `node_modules` and `dist` deleted afterwards (lockfile kept).
- NOT verified: mouse-driven drag & drop end-to-end (see above); the `_redirects`/`vercel.json` files were not tested on Netlify/Vercel (no accounts, by design); keyboard-only drag & drop is not implemented (native DnD only; the card modal's "Move to" select is the accessible alternative).

## API mock — there is NO backend
See `src/mocks/README.md` and the `/api-mock` page. The app never issues an HTTP request: login compares the form against `MOCK_USERS`, writes `{ token, user }` to `localStorage["flowboard.auth"]`, and the board is seeded from `src/mocks/board.ts` into `localStorage["flowboard.board"]`. Nothing needs proxying under `/api`.
