#!/usr/bin/env bash
# Report heavy generated artefacts that should not be committed (node_modules, vendor, build output...).
set -euo pipefail
cd "$(dirname "$0")/.."
found=0
while IFS= read -r path; do
  echo "  $path ($(du -sh "$path" 2>/dev/null | cut -f1))"
  found=1
done < <(find . -maxdepth 4 -type d \( -name node_modules -o -name vendor -o -name .venv -o -name venv -o -name target -o -name bin -o -name obj -o -name .next -o -name .nuxt -o -name .output -o -name .svelte-kit -o -name .astro -o -name dist -o -name build -o -name __pycache__ -o -name .tmp \) -not -path "*/node_modules/*" -not -path "./00-control-panel/*" -prune 2>/dev/null | sort)
if [ "$found" -eq 0 ]; then echo "clean: no generated artefacts found"; else echo "generated artefacts present (see above)"; exit 1; fi
