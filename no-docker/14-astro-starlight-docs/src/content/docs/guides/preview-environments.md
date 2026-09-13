---
title: Preview environments
description: How Kestrel environments are built, synced, routed and expired, and how to model multi-service apps.
sidebar:
  order: 1
---

A Kestrel environment is an isolated deployment of one branch: the app container, any `[[services]]` you declare, a routing layer and a URL. This guide explains the lifecycle so you can predict what `kestrel up` will do.

## Lifecycle

```text
up ──► building ──► deploying ──► ready ──► (sync on push) ──► expired / down
```

- **building** — the build context is uploaded (only changed files after the first time) and built on Kestrel's builders with a per-branch layer cache.
- **deploying** — services start first, honouring `healthcheck`, then the app.
- **ready** — the URL is live. Health is polled every 30 seconds.
- **sync** — running `kestrel up` again on the same branch rebuilds and swaps the app container in place. Service volumes persist.
- **expired** — after `ttl` of no HTTP traffic and no syncs, the environment is torn down. Volumes are deleted.

## Naming and URLs

Environment names are `<name>-<branch-slug>` and URLs follow `https://<environment>.preview.example`. Override with `--name`. Names are unique per workspace, so two people running `kestrel up` on the same branch share the environment.

## Multi-service apps

Declare dependencies in `kestrel.toml`:

```toml
[[services]]
name  = "db"
image = "postgres:16-alpine"
env   = { POSTGRES_PASSWORD = "secret://db-password" }
volume = "1Gi"
healthcheck = "pg_isready -U postgres"

[[services]]
name  = "cache"
image = "redis:7-alpine"
```

Inside the environment the app reaches them at `db:5432` and `cache:6379`. Pass connection strings through `[build].args` or runtime env in your Containerfile as usual.

## Compose projects

If your repository has a `compose.yaml`, Kestrel uses the `compose` preset: every service is deployed, `depends_on` ordering is respected, and the first service with a `ports` entry becomes the default route. `build:` sections are built remotely; `image:` services are pulled.

## Seeding data

Run a one-off command after deploy with a `[hooks]` table:

```toml
[hooks]
post_deploy = "npm run db:seed"
```

Hooks run inside the app container and must exit 0, otherwise the environment is marked `failed` and the previous version stays live.

## Protecting previews

Set `protect = true` (or `--protect`) to put the URL behind Kestrel SSO. Anyone in the workspace can open it; nobody else can.

## Costs and quotas

Workspaces have a concurrent-environment quota. `kestrel list --status ready` shows what is running; `kestrel down --all --yes` frees everything you own.
