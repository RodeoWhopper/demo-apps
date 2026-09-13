---
title: Getting started
description: Install Kestrel, log in and deploy your first preview environment in under five minutes.
sidebar:
  order: 1
---

Kestrel is a single static binary. There is nothing to run as a service on your machine and no agent to install in your cluster: the CLI talks to the Kestrel control plane over HTTPS and your CI runs the same binary.

## Prerequisites

- A project with a `Containerfile`, a `compose.yaml`, or one of the [detected framework presets](/configuration/#framework-presets).
- A Kestrel workspace token (your admin can create one in the dashboard).
- macOS, Linux or Windows (WSL 2) on x86-64 or arm64.

## 1. Install

```bash
curl -fsSL https://kestrel.example/install.sh | sh
kestrel version
```

See [Installation](/installation/) for Homebrew, npm and container image options.

## 2. Log in

```bash
kestrel login
```

This opens a browser window for a device-code login and stores a short-lived token in `~/.config/kestrel/credentials`. In CI, set `KESTREL_TOKEN` instead — see [CI integration](/guides/ci-integration/).

## 3. Deploy a preview

From the root of your repository:

```bash
kestrel up
```

Kestrel detects how to build your project, uploads the build context, builds it remotely and prints a URL:

```text
✔ Detected: Containerfile (multi-stage, node:22-alpine)
✔ Built image in 41s (cache hit: 78%)
✔ Environment ready  https://feature-login.preview.example
```

Every push to the same branch reuses the environment. Kestrel diffs the build context and only uploads what changed.

## 4. Watch it

```bash
kestrel logs -f
kestrel status
```

## 5. Tear it down

```bash
kestrel down
```

Environments also expire automatically after `ttl` (default `72h`). Configure this and much more in [`kestrel.toml`](/configuration/).

## Next steps

- [Configure `kestrel.toml`](/configuration/) for build args, services and TTLs.
- [Wire it into CI](/guides/ci-integration/) so every pull request gets a link.
- [Manage secrets](/guides/secrets-management/) without copying `.env` files around.
