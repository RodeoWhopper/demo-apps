# /api-mock — there is NO backend

Flowboard is a pure client-side SPA. Nothing in this folder talks to a server:

- `users.ts` — two hard-coded accounts used by the login form. The "token" written to
  `localStorage` is a random-looking string with no cryptographic meaning.
- `board.ts` — the seed board written to `localStorage` on first visit and by "Reset board".

Deploying the app therefore means serving `dist/` as static files with an SPA fallback to
`index.html` (see `nginx.conf`, `public/_redirects`, `vercel.json`). There is no API to proxy.
