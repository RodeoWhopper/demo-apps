---
title: Secrets management
description: Use secret:// references so preview environments read secrets from your vault at deploy time.
sidebar:
  order: 3
---

Kestrel never stores secret values. Instead you register **references** that point at an entry in a vault you already run, and use them in `kestrel.toml` with the `secret://` scheme. The value is fetched by the deployer at start time and injected into the container.

## Register a reference

```bash
kestrel secret add db-password --from vault://kv/storefront/db#password
kestrel secret add stripe-key  --from aws-sm://prod/stripe/secret-key
kestrel secret list
```

```text
NAME          PROVIDER  PATH
db-password   vault     kv/storefront/db#password
stripe-key    aws-sm    prod/stripe/secret-key
```

## Use it

```toml
[build]
args = { NPM_TOKEN = "secret://npm-token" }

[[services]]
name  = "db"
image = "postgres:16-alpine"
env   = { POSTGRES_PASSWORD = "secret://db-password" }
```

Build-time references are injected as build secrets that are mounted only during the build (never written to image layers). Runtime references become environment variables.

## Providers

| Provider | Scheme | Auth |
|----------|--------|------|
| HashiCorp Vault | `vault://` | AppRole configured in the workspace |
| AWS Secrets Manager | `aws-sm://` | IAM role assumed by the deployer |
| GCP Secret Manager | `gcp-sm://` | Workload identity |
| Azure Key Vault | `azure-kv://` | Managed identity |
| Doppler | `doppler://` | Service token |
| 1Password | `1password://` | Connect server |

## Rotation

Rotate the value in the vault. The next `kestrel up` (or a `kestrel status --restart`) picks it up; running environments are not changed automatically.

## What not to do

- Do not commit `.env` files "just for previews". Use references.
- Do not pass secrets as `--build-arg`; they end up in image metadata.
- Do not share workspace tokens between repositories.
