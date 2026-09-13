# Terracotta Supply – plant-pot shop (SvelteKit 2 + Svelte 5)

Terracotta Supply is a fictional plant-pot e-commerce site: a warm, hand-styled catalogue of ten pots, a
cart, checkout, a customer account area with order history and an admin section with product CRUD. What
makes it distinct: **every mutation is a SvelteKit form action** (`POST /login?/login`,
`/cart?/checkout`, `/admin/products?/create` …) that also works without JavaScript; authentication is a
**server-side cookie session resolved in `hooks.server.ts`** (opaque id → in-memory `Map`, mirrored to
`data/sessions.json` so restarts keep people signed in); access control lives in **route-group layouts**
(`(public)`, `(account)`, `(admin)`) that `redirect(303)` or `error(403)`; the **cart is a JSON cookie**;
and the app is served by **`@sveltejs/adapter-node`** as a plain Node process.

## Stack

- Node.js 22 (developed and verified on Node 26.5)
- SvelteKit 2.70.3 · Svelte 5.57.0 (runes, snippets) · `@sveltejs/adapter-node` 5.5.7
- Vite 7.3.6 · `@sveltejs/vite-plugin-svelte` 6.2.4
- TypeScript 5.9.3 · svelte-check 4.7.6 · `@types/node` 22.20.2
- bcryptjs 3.0.3 (password hashes) – the only runtime dependency
- Hand-written CSS (`src/app.css`), no CSS framework, no runtime network requests

## Ports

| Port | Purpose |
| --- | --- |
| 3012 | HTTP (site, form actions, `/healthz`) |

## Quick start (local)

```bash
cd 12-sveltekit-shop
cp .env.example .env     # optional; defaults work for localhost
npm ci
npm run build            # vite build -> ./build (adapter-node)
npm start                # node server.js -> sets PORT/HOST/ORIGIN defaults, then loads ./build
# equivalent without the wrapper:
ORIGIN=http://localhost:3012 PORT=3012 node build
# dev server with HMR:
npm run dev              # http://localhost:3012
npm run check            # svelte-check (type check)
```

The JSON stores in `data/` are created and seeded on the first request.

## Docker

```bash
docker build -t terracotta-supply .
docker run --rm -p 3012:3012 \
  -e ORIGIN=http://localhost:3012 \
  -v terracotta-data:/app/data \
  terracotta-supply
curl http://localhost:3012/healthz
```

Two-stage `node:22-alpine` image: the build stage runs `npm ci`, `npm run build` and `npm prune --omit=dev`;
the runtime stage copies `build/`, the pruned `node_modules/`, `package.json` and `server.js`, runs as the
unprivileged `app` user with `PORT=3012`, `HOST=0.0.0.0`, `DATA_DIR=/app/data`, and declares
`VOLUME /app/data`. When the site is reachable under any URL other than `http://localhost:3012`, pass
`-e ORIGIN=<public URL>` (see below).

## Environment variables

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `ORIGIN` | no, **but must match the public URL** | `http://localhost:3012` (set by `server.js` with a warning) | Public origin (`scheme://host[:port]`) as browsers see it. SvelteKit compares the `Origin` header of every form-action POST against it and answers **403 "Cross-site POST form submissions are forbidden"** on mismatch, so login and every other form break if this is wrong. Set e.g. `https://shop.example.com` in real deployments. |
| `PORT` | no | `3012` | HTTP port. |
| `HOST` | no | `0.0.0.0` | Bind address. |
| `COOKIE_SECURE` | no | `false` | `true` behind HTTPS so the `tc_session` / `tc_cart` cookies get the `Secure` flag. Keep `false` for plain-HTTP access. |
| `DATA_DIR` | no | `./data` (Docker: `/app/data`) | Directory for the JSON stores. Must be writable. |
| `BODY_SIZE_LIMIT`, `PROTOCOL_HEADER`, `HOST_HEADER`, `ADDRESS_HEADER` | no | adapter-node defaults | Standard adapter-node options (e.g. `PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host` behind a proxy as an alternative to `ORIGIN`). |

## Default credentials

| Role | Email | Password | Can |
| --- | --- | --- | --- |
| admin | `owner@terracotta.shop` | `Owner123!` | everything, incl. `/admin` and product CRUD |
| customer | `shopper@terracotta.shop` | `Shop123!` | shop, check out, see own orders |

New customers can self-register at `/register` (always role `customer`).

## Routes

| Path | Method | Auth required? | Description |
| --- | --- | --- | --- |
| `/healthz` | GET | no | Health check → `{"status":"ok","products":10,...}` |
| `/` | GET | no | Home page with featured pots |
| `/products` | GET | no | Catalogue; `?material=terracotta|glazed|concrete|ceramic` filter |
| `/products/[slug]` | GET | no | Product detail (404 for unknown slugs) |
| `/products/[slug]?/add` | POST | no | Form action: add `qty` to the cookie cart (400 if sold out / bad qty) |
| `/cart` | GET | no | Cart contents |
| `/cart?/update`, `/cart?/remove` | POST | no | Form actions: change quantity / remove a line |
| `/cart?/checkout` | POST | session | Creates an order, decrements stock, clears the cart → 303 `/account/orders?placed=<id>`; anonymous → 303 `/login?next=/cart`; empty cart → 400; insufficient stock → 409 |
| `/login` | GET | no | Sign-in page (signed-in users are sent to `?next` / `/account`) |
| `/login?/login` | POST | no | Form action: `email`, `password`, optional `next` → 303 on success (`Set-Cookie: tc_session`), 401 on bad credentials, 400 on missing fields |
| `/register` | GET | no | Registration page |
| `/register?/register` | POST | no | Form action: `name`, `email`, `password` (≥ 8 chars) → 303 `/account`; 400 on validation errors, 409 if the email exists |
| `/logout` | GET / POST | no | POST (default action) deletes the server-side session, clears the cookie → 303 `/` |
| `/account` | GET | session | Profile + stats |
| `/account/orders` | GET | session | Order history |
| `/admin` | GET | session, role `admin` | Stats, recent orders, low-stock list (customers get **403**) |
| `/admin/products` | GET | session, role `admin` | Product table with inline edit forms |
| `/admin/products?/create`, `?/update`, `?/delete` | POST | session, role `admin` | Product CRUD form actions (400 with an error list on invalid input, 404 for unknown ids) |

Anonymous requests to `(account)` / `(admin)` routes are redirected **303** to `/login?next=<path>`.
Unknown or expired session ids are cleared from the cookie by `hooks.server.ts`.

Calling form actions with curl: send `Origin: http://localhost:3012` (must equal `ORIGIN`) and
`Accept: text/html` to get browser-like 303 / 4xx responses; without `Accept: text/html` SvelteKit treats
the POST as a JSON action request and replies 200 with `{"type":"redirect"|"failure"|"success",...}`.
Actions without fields (checkout, logout) still need a form-encoded body (`-d ''`), otherwise 415.

## Data / persistence

- `data/` (`DATA_DIR`) holds four JSON files, each created and seeded on first read and rewritten
  atomically (temp file + rename) on change:
  - `users.json` – 2 seeded users (bcryptjs hashes) plus self-registered customers
  - `products.json` – 10 seeded pots (one sold out, a few low on stock); stock is decremented at checkout
  - `orders.json` – orders placed through checkout
  - `sessions.json` – mirror of the in-memory session `Map` (7-day TTL); restarting keeps sessions valid
- The cart is not stored server-side: it lives in the `tc_cart` cookie (`{productId: qty}`, 30 days).
- Delete the JSON files to re-seed. The Docker image declares a volume at `/app/data`.

## Verification performed

Run on macOS with Node 26.5.0 / npm 11.17 and Docker 29. All of the following were executed and returned
the stated results:

- `npm install` → clean install, lockfile generated (`npm audit`: 3 low advisories in transitive dev
  tooling only). `npm run check` → svelte-check: 0 errors, 0 warnings. `npm run build` → adapter-node output
  in `build/`.
- `npm start` (→ `node server.js`, which logged the `ORIGIN not set - defaulting to http://localhost:3012`
  warning and `Listening on http://0.0.0.0:3012`), then with curl:
  - `GET /healthz` → 200 JSON with `products: 10`; `/`, `/products`, `/products?material=glazed`,
    `/products/sage-glazed-16`, `/cart`, `/login`, `/register`, `/favicon.svg` and a `/_app/immutable/...`
    client asset → 200; `/products/nope` → 404.
  - `/account`, `/account/orders`, `/admin` without a cookie → 303 to `/login?next=...`.
  - `POST /login?/login` without an `Origin` header → 403 (SvelteKit CSRF check); wrong password → 401
    with "Invalid email or password"; shopper credentials → 303 to the `next` path and
    `Set-Cookie: tc_session=...; HttpOnly; SameSite=Lax`.
  - As shopper: `/account` 200 ("Hello, Sam Fern"), `/account/orders` 200, `/admin` → 403 ("shop staff
    only"), `/login` → 303 to `/account`; `?/add` twice (cart cookie held two lines, `/cart` rendered them
    with the correct total), adding a sold-out pot → 400 "sold out"; `?/update` and `?/remove` changed the
    cookie; `?/checkout` → 303 to `/account/orders?placed=ord_…`, cart cookie removed, `orders.json` holds
    the order (3 × Sage Glazed, 5700 cents) and `products.json` stock dropped 42 → 39; the order appears on
    `/account/orders` and on the owner's `/admin`. Empty-cart checkout → 400; anonymous checkout → 303 to
    `/login?next=/cart`.
  - As owner: `/admin` and `/admin/products` → 200; `?/create` added a product (visible at its public slug),
    invalid input → 400, `?/update` changed name/price/stock on disk, `?/delete` removed it. A shopper calling
    `?/delete` → 403.
  - `POST /register?/register` → 303 `/account` (new customer can open `/account`, gets 403 on `/admin`);
    duplicate email → 409; short password → 400. `users.json` then held 3 users.
  - `POST /logout` → 303 `/`, `/account` afterwards → 303; `sessions.json` shrank by one. A bogus
    `tc_session` cookie is cleared (`Max-Age=0`) and `/account` → 303.
  - Same flow with `Accept: */*` confirmed the JSON-negotiated 200 responses described above.
- Docker: `docker build -t demo-12-terracotta:test .` succeeded (image ~232 MB); `docker run -p 3012:3012`
  was up in ~2 s and passed `/healthz`, `/`, a client asset, `/products`, a product page and `/favicon.svg`
  (200), `/account` → 303, shopper login → 303 + `/account` 200 + `/admin` 403, add-to-cart + checkout →
  303 with an order id, owner login → `/admin` and `/admin/products` 200. A POST with
  `Origin: http://127.0.0.1:3012` (≠ `ORIGIN`) → 403 as documented. `/app/data/*.json` were created by the
  unprivileged `app` user.

Not verified: behaviour in a real browser (JS-enhanced forms via `use:enhance`, the edit toggles on
`/admin/products`), `COOKIE_SECURE=true` behind HTTPS, `ORIGIN` set to a non-localhost public URL, and
`npm run dev` / `npm run preview`.
