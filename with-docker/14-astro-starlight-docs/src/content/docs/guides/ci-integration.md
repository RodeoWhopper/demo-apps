---
title: CI integration
description: Run Kestrel from GitHub Actions, GitLab CI or any runner, comment the URL on pull requests and clean up on merge.
sidebar:
  order: 2
---

Kestrel is the same binary in CI as on your laptop. Authenticate with a `KESTREL_TOKEN` secret and call `kestrel up`.

## GitHub Actions

```yaml
name: preview
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  preview:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    env:
      KESTREL_TOKEN: ${{ secrets.KESTREL_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - name: Install Kestrel
        run: curl -fsSL https://kestrel.example/install.sh | sh
      - name: Deploy preview
        if: github.event.action != 'closed'
        run: kestrel up --comment --ttl 7d
      - name: Tear down
        if: github.event.action == 'closed'
        run: kestrel down --yes
```

`--comment` uses the `GITHUB_TOKEN` in the environment to post (and later update) a single comment with the preview URL and build stats.

## GitLab CI

```yaml
preview:
  stage: deploy
  image: ghcr.io/kestrel-example/kestrel:1.4
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  script:
    - kestrel up --comment --ttl 7d
  environment:
    name: preview/$CI_COMMIT_REF_SLUG
    url: https://$KESTREL_ENV_URL
    on_stop: preview:stop

preview:stop:
  stage: deploy
  image: ghcr.io/kestrel-example/kestrel:1.4
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: manual
  script:
    - kestrel down --yes
  environment:
    name: preview/$CI_COMMIT_REF_SLUG
    action: stop
```

## Any other runner

```bash
export KESTREL_TOKEN=...
kestrel up --json > preview.json
jq -r .url preview.json
```

## Tips

- Use `--wait` (the default) so the job fails if the health check does not pass; use `--no-wait` to return immediately and poll with `kestrel status`.
- Cache is per branch. The first build on a new branch is slower; subsequent pushes typically hit 70–90 % of layers.
- Pin the binary version in CI (`install.sh -v 1.4.0` or the tagged Docker image) so a release does not change behaviour mid-week.
- Tokens are scoped to a workspace. Create one per repository if you want revocation granularity.
