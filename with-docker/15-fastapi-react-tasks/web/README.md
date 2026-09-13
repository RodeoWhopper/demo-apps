# Orbit Tasks web (`web/`)

React 19 + Vite 6 + TypeScript + React Router 7 + Tailwind 4 single-page app for the Orbit Tasks board. See the root README for the full picture.

- Port: **5015** (Vite dev, Vite preview and the nginx image all use it). nginx also answers `GET /healthz`.
- `VITE_API_URL` is baked into the bundle at **build time**: `http://localhost:8015` for local dev (default in code), `/api` in Docker where `nginx.conf` proxies `/api/` to the `api` compose service.
- Local: `npm ci && VITE_API_URL=http://localhost:8015 npm run dev` (or `npm run build && npm run preview`).
- Docker: `docker build --build-arg VITE_API_URL=/api -t orbit-web . && docker run -p 5015:5015 orbit-web` (the `/api` proxy needs a reachable `api` host — use `docker compose` from the repo root).
- Routes: `/login`, `/` (board), `/projects/:id`, `/admin` (admin role only, otherwise a 403 page); everything except `/login` sits behind `ProtectedRoute`, which redirects to `/login` and back.
- Token handling: kept in React state and mirrored to `localStorage` (`orbit.token`); `GET /auth/me` on load validates it and a 401/403 clears it.

Layout: `src/App.tsx` (router), `src/lib/{api.ts,auth.tsx,types.ts}`, `src/components/{Layout,ProtectedRoute,AdminRoute,TaskCard,Spinner}.tsx`, `src/pages/{Login,Board,ProjectPage,Admin,Forbidden,NotFound}.tsx`, `nginx.conf`, `Dockerfile` (multi-stage node:22-alpine → nginx:1.27-alpine).
