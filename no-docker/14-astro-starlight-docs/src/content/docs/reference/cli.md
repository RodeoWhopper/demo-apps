---
title: CLI reference
description: Complete reference for every kestrel command, its flags, and exit codes.
---

:::note
This page is generated from `kestrel --help --all` at release time. Version **1.4.0**.
:::

## Global flags

| Flag | Env | Default | Description |
|------|-----|---------|-------------|
| `--token <token>` | `KESTREL_TOKEN` | — | Workspace token. Overrides stored credentials. |
| `--api <url>` | `KESTREL_API` | `https://api.kestrel.example` | Control-plane endpoint. |
| `--region <id>` | `KESTREL_REGION` | workspace default | Target region. |
| `--json` | — | `false` | Machine-readable output on stdout; logs go to stderr. |
| `--quiet`, `-q` | — | `false` | Suppress progress output. |
| `--verbose`, `-v` | `KESTREL_LOG=debug` | `false` | Debug logging. Repeat for trace. |
| `--no-color` | `NO_COLOR` | `false` | Disable ANSI colours. |
| `--help`, `-h` | — | — | Show help for the command. |

## Commands

| Command | Summary |
|---------|---------|
| [`kestrel login`](#kestrel-login) | Authenticate with the control plane. |
| [`kestrel logout`](#kestrel-logout) | Remove stored credentials. |
| [`kestrel init`](#kestrel-init) | Write a starter `kestrel.toml`. |
| [`kestrel up`](#kestrel-up) | Build and deploy (or sync) the current branch. |
| [`kestrel down`](#kestrel-down) | Tear down an environment. |
| [`kestrel status`](#kestrel-status) | Show environment state and URL. |
| [`kestrel logs`](#kestrel-logs) | Stream container logs. |
| [`kestrel list`](#kestrel-list) | List environments in the workspace. |
| [`kestrel secret`](#kestrel-secret) | Manage secret references. |
| [`kestrel open`](#kestrel-open) | Open the preview URL in a browser. |
| [`kestrel completion`](#kestrel-completion) | Generate shell completions. |
| [`kestrel self-update`](#kestrel-self-update) | Upgrade the binary in place. |
| [`kestrel version`](#kestrel-version) | Print version and build info. |

---

### `kestrel login`

Authenticate via device-code flow and store a token in `~/.config/kestrel/credentials`.

| Flag | Default | Description |
|------|---------|-------------|
| `--no-browser` | `false` | Print the URL instead of opening it. |
| `--token <token>` | — | Store a token directly without the browser flow. |

### `kestrel logout`

Delete stored credentials. No flags.

### `kestrel init`

Detect the project and write `kestrel.toml`.

| Flag | Default | Description |
|------|---------|-------------|
| `--preset <name>` | auto | Force a framework preset. |
| `--force` | `false` | Overwrite an existing file. |

### `kestrel up`

Build and deploy the current branch. Reuses an existing environment for the branch when present.

| Flag | Default | Description |
|------|---------|-------------|
| `--name <name>` | branch slug | Environment name. |
| `--ttl <duration>` | `72h` | Idle lifetime. |
| `--preset <name>` | auto | Force a framework preset. |
| `--build-arg KEY=VALUE` | — | Repeatable. Merged over `[build].args`. |
| `--no-cache` | `false` | Ignore the layer cache. |
| `--wait` / `--no-wait` | `--wait` | Block until the environment is healthy. |
| `--comment` | `false` | Post the URL as a comment on the linked pull request. |
| `--protect` | config | Require SSO to open the URL. |

**Output (`--json`)**

```json
{
  "name": "storefront-feature-login",
  "url": "https://storefront-feature-login.preview.example",
  "status": "ready",
  "build": { "duration_ms": 41210, "cache_hit_ratio": 0.78 }
}
```

### `kestrel down`

Tear down an environment and delete its volumes.

| Flag | Default | Description |
|------|---------|-------------|
| `--name <name>` | branch slug | Environment name. |
| `--all` | `false` | Tear down every environment you own. |
| `--yes`, `-y` | `false` | Skip the confirmation prompt. |

### `kestrel status`

Show state, URL, expiry and running services for one environment.

| Flag | Default | Description |
|------|---------|-------------|
| `--name <name>` | branch slug | Environment name. |
| `--watch`, `-w` | `false` | Refresh every 2 seconds. |

### `kestrel logs`

Stream logs from the app container (or a named service).

| Flag | Default | Description |
|------|---------|-------------|
| `--name <name>` | branch slug | Environment name. |
| `--service <name>` | app | Service to read from. |
| `--follow`, `-f` | `false` | Keep streaming. |
| `--since <duration>` | `10m` | Start point. |
| `--tail <n>` | `200` | Lines to print initially. |

### `kestrel list`

List environments in the workspace.

| Flag | Default | Description |
|------|---------|-------------|
| `--mine` | `false` | Only environments you created. |
| `--status <state>` | all | Filter: `building`, `ready`, `failed`, `expired`. |

### `kestrel secret`

Manage `secret://` references. Values never transit the CLI; Kestrel stores a pointer to your vault.

| Subcommand | Description |
|------------|-------------|
| `secret list` | Show references available to this project. |
| `secret add <name> --from <provider>://<path>` | Register a reference. |
| `secret rm <name>` | Remove a reference. |

Supported providers: `vault`, `aws-sm`, `gcp-sm`, `azure-kv`, `doppler`, `1password`.

### `kestrel open`

Open the preview URL in the default browser. Accepts `--name`.

### `kestrel completion`

`kestrel completion <bash|zsh|fish|powershell>` prints a completion script.

### `kestrel self-update`

Replace the running binary with the latest release. Refuses if the binary was installed by Homebrew or npm.

### `kestrel version`

Print version, platform, commit and build date. With `--json` returns an object.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Generic failure |
| `2` | Invalid usage (bad flag, missing argument) |
| `3` | Authentication required or token expired |
| `4` | Build failed |
| `5` | Deploy failed or health check timed out |
| `6` | Environment not found |
| `7` | Quota or permission denied |
