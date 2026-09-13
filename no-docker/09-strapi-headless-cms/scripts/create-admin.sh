#!/usr/bin/env bash
# Creates the first Strapi admin user. Strapi 5 cannot create admins from env vars alone.
# Usage: scripts/create-admin.sh   (runs npx strapi inside ./cms; the server may be running or stopped)
# Env overrides: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRSTNAME, ADMIN_LASTNAME
set -euo pipefail
cd "$(dirname "$0")/.."

EMAIL="${ADMIN_EMAIL:-admin@tarla.dev}"
PASSWORD="${ADMIN_PASSWORD:-Admin123!}"
FIRST="${ADMIN_FIRSTNAME:-Admin}"
LAST="${ADMIN_LASTNAME:-User}"

set +e
OUT="$(cd cms && npx strapi admin:create-user --email="$EMAIL" --password="$PASSWORD" --firstname="$FIRST" --lastname="$LAST" 2>&1)"
STATUS=$?
set -e

if [ $STATUS -eq 0 ]; then
  echo "Admin user created: $EMAIL / $PASSWORD"
elif echo "$OUT" | grep -qi "already"; then
  echo "Admin user $EMAIL already exists – nothing to do."
else
  echo "$OUT"
  exit $STATUS
fi
