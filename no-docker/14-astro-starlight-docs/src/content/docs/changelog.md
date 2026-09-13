---
title: Changelog
description: Release notes for the Kestrel CLI.
---

All notable changes to the CLI are listed here. Kestrel follows semantic versioning.

## 1.4.0 — 2026-08-30

**Added**
- `kestrel up --comment` now updates the existing pull-request comment instead of posting a new one on every push.
- `[hooks] post_deploy` runs a command in the app container after a successful deploy.
- `--json` output for `status`, `list` and `version`.
- Framework presets: `astro`, `vite`.

**Changed**
- Default `ttl` raised from `48h` to `72h`.
- Build-context upload is now incremental (content-addressed). First uploads are unchanged; subsequent ones are 5–20× smaller.

**Fixed**
- `logs -f` no longer drops lines when the app container restarts.
- Windows/WSL: credentials file is created with correct permissions.

## 1.3.2 — 2026-06-11

**Fixed**
- `down --all` skipped environments named with uppercase branch slugs.
- Vault provider: token renewal failed silently after 24 h.

## 1.3.0 — 2026-05-02

**Added**
- `protect` option and `--protect` flag (SSO-gated previews).
- Doppler and 1Password secret providers.

**Deprecated**
- `kestrel deploy` (alias of `up`) prints a warning and will be removed in 2.0.

## 1.2.0 — 2026-02-18

**Added**
- `[[services]]` with `volume` and `healthcheck`.
- `kestrel completion` for bash, zsh, fish and PowerShell.

## 1.1.0 — 2025-11-27

**Added**
- Compose preset: deploy every service in `compose.yaml`.
- `--region` global flag.

## 1.0.0 — 2025-09-15

Initial stable release: `login`, `up`, `down`, `status`, `logs`, `list`, `secret`.
