# Nordwind Coffee Roasters — static landing page

A marketing landing page for a fictional small-batch coffee roastery in Bergen, Norway. It is the simplest app in the set: **pure HTML5 + CSS + vanilla JavaScript with no build step, no npm and no framework**. What makes it unique is that "deploying" it means copying files to a web server — there is nothing to install, build or run other than a static file server. The included `nginx.conf` adds gzip, cache headers and a real custom 404 page. The contact form intentionally posts nowhere; JavaScript shows a success toast instead.

## Stack
- HTML5 (four pages: `index.html`, `about.html`, `contact.html`, `404.html`)
- CSS3 with custom properties, responsive grid, dark mode via `prefers-color-scheme` (`css/styles.css`)
- Vanilla JavaScript, no dependencies (`js/main.js`: mobile nav toggle, scroll reveal, FAQ accordion, form toast)
- Inline SVG logo and illustrations only (`assets/`) — no binary images
- nginx 1.27 (alpine) for serving in Docker
- python3 `http.server` for a zero-dependency local preview (`serve.sh`)

## Ports
| Port | Purpose |
|------|---------|
| 8081 | HTTP (nginx in Docker, or python http.server locally) |

## Quick start (local)
```sh
cd 01-static-landing
./serve.sh            # python3 -m http.server 8081
# open http://localhost:8081
```
No install or build step exists. Note that `python http.server` does not serve the custom 404 page or gzip; use Docker for production-equivalent behaviour.

## Docker
```sh
docker build -t nordwind-static .
docker run --rm -p 8081:8081 nordwind-static
curl -i http://localhost:8081/          # 200
curl -i http://localhost:8081/nope      # 404 with custom page
```
The image is `nginx:1.27-alpine` with `nginx.conf` copied to `/etc/nginx/conf.d/default.conf` and the site copied to `/usr/share/nginx/html`.

## Environment variables
None. The app reads no environment variables, so there is no `.env.example`.

| name | required | default | description |
|------|----------|---------|-------------|
| — | — | — | none |

## Default credentials
None — there is no authentication.

## Routes
| path | method | auth required? | description |
|------|--------|----------------|-------------|
| `/` | GET | no | Landing page (health check target) |
| `/about.html` | GET | no | About / team / timeline |
| `/contact.html` | GET | no | Contact form (client-side only, shows toast) |
| `/404.html` | GET | no | Custom not-found page (nginx serves it for any unknown path) |
| `/robots.txt` | GET | no | Robots file |
| `/sitemap.xml` | GET | no | Sitemap |
| `/site.webmanifest` | GET | no | Web app manifest |
| `/css/*`, `/js/*`, `/assets/*` | GET | no | Static assets (7-day cache in nginx) |

## Data / persistence
None. Fully static; the contact form never sends data anywhere.

## Verification performed
- `docker build -t nordwind-static .` — built successfully.
- `docker run -d -p 8081:8081 nordwind-static` then:
  - `curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/` → `200`
  - `curl … /about.html` → `200`, `/contact.html` → `200`
  - `curl -i http://localhost:8081/nope` → `404` and the body contains the custom 404 page text.
  - `curl -H 'Accept-Encoding: gzip' -I …/css/styles.css` → `Content-Encoding: gzip`, `Cache-Control: max-age=604800` and the security headers (`X-Content-Type-Options`, `X-Frame-Options`).
- `./serve.sh` started python `http.server` on 8081 and `curl /` returned 200; stopped afterwards.
- Container and local server were stopped after verification.
- NOT verified: real-browser rendering / visual review (only curl was used); Lighthouse/accessibility audits.
