---
title: Configuration
description: Every key in kestrel.toml, the precedence rules, environment variables and framework presets.
sidebar:
  order: 3
---

Kestrel works without a config file. Add a `kestrel.toml` at the repository root when you need to override detection, add services or tune lifetimes.

## Precedence

Settings are resolved in this order (first match wins):

1. Command-line flags (`--ttl 12h`)
2. Environment variables (`KESTREL_TTL=12h`)
3. `kestrel.toml` in the repository root
4. Workspace defaults from the control plane
5. Built-in defaults

## Minimal example

```toml
# kestrel.toml
name = "storefront"
ttl  = "48h"

[build]
dockerfile = "docker/Dockerfile"
context    = "."
args       = { NODE_ENV = "production" }

[[services]]
name  = "db"
image = "postgres:16-alpine"
env   = { POSTGRES_PASSWORD = "secret://db-password" }

[routes]
"/"      = { port = 3000 }
"/api"   = { port = 8080, service = "api" }
```

## Top-level keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `name` | string | repository name | Environment name prefix. Branch slug is appended. |
| `ttl` | duration | `72h` | Idle lifetime before automatic teardown. `0` disables expiry (requires admin). |
| `region` | string | workspace default | Deploy region, e.g. `eu-west`, `us-east`. |
| `protect` | bool | `false` | Require Kestrel SSO login to open the preview URL. |

## `[build]`

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `dockerfile` | path | auto-detected | Path to the Dockerfile relative to `context`. |
| `context` | path | `.` | Build context uploaded to the builder. Respects `.dockerignore`. |
| `target` | string | — | Multi-stage build target. |
| `args` | table | `{}` | Build arguments. Values may use `secret://` references. |
| `preset` | string | auto-detected | Force a [framework preset](#framework-presets) instead of a Dockerfile. |
| `cache` | bool | `true` | Reuse layer cache between builds of the same branch. |

## `[[services]]`

Extra containers deployed alongside the app. Each entry accepts:

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `name` | string | yes | Hostname other containers use to reach it. |
| `image` | string | yes | Image reference. |
| `env` | table | no | Environment variables; `secret://` references allowed. |
| `volume` | string | no | Persistent volume size, e.g. `1Gi`. Data survives syncs, not teardown. |
| `healthcheck` | string | no | Command run until it exits 0 before the app starts. |

## `[routes]`

Map URL path prefixes to container ports. The default route is `"/" = { port = <detected> }`.

## Environment variables

| Variable | Description |
|----------|-------------|
| `KESTREL_TOKEN` | Workspace token for non-interactive use (CI). |
| `KESTREL_API` | Override the control-plane URL (self-hosted installs). |
| `KESTREL_TTL` | Same as `ttl`. |
| `KESTREL_REGION` | Same as `region`. |
| `KESTREL_LOG` | `error`, `warn`, `info` (default), `debug`, `trace`. |
| `NO_COLOR` | Disable coloured output. |

## Framework presets

When no Dockerfile is present, Kestrel checks for these in order and generates a build for you:

| Preset | Detected by | Notes |
|--------|-------------|-------|
| `compose` | `docker-compose.yml` / `compose.yaml` | Every service is deployed; the first `ports` entry becomes the route. |
| `nextjs` | `next.config.*` | Uses standalone output. |
| `nuxt` | `nuxt.config.*` | SSR by default; `nuxt generate` output if `ssr = false`. |
| `astro` | `astro.config.*` | Static output served by nginx. |
| `vite` | `vite.config.*` | Static output served by nginx; SPA fallback enabled. |
| `node` | `package.json` with a `start` script | Runs `npm ci && npm run build && npm start`. |
| `python` | `pyproject.toml` / `requirements.txt` | Expects a `Procfile` or `[build].command`. |
| `go` | `go.mod` | Builds `./cmd/*` or the module root. |
| `static` | `index.html` | Served by nginx. |

Force a preset with `[build] preset = "static"` or `kestrel up --preset static`.
