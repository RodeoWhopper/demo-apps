#!/usr/bin/env sh
# Local preview without Docker. Note: python's http.server does NOT serve the custom 404 page
# or gzip — use the Dockerfile/nginx.conf for production-equivalent behaviour.
cd "$(dirname "$0")" && exec python3 -m http.server 8081 --bind 0.0.0.0
