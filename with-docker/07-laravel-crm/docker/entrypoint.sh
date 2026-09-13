#!/bin/sh
# Halka CRM container entrypoint: prepare SQLite file, app key, migrations + idempotent seed, caches.
set -eu
cd /var/www/html

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
  DB_FILE="${DB_DATABASE:-/data/database.sqlite}"
  case "$DB_FILE" in /*) ;; *) DB_FILE="/var/www/html/$DB_FILE" ;; esac
  mkdir -p "$(dirname "$DB_FILE")"
  if [ ! -f "$DB_FILE" ]; then
    touch "$DB_FILE"
    echo "[halka] created SQLite database at $DB_FILE"
  fi
  export DB_DATABASE="$DB_FILE"
fi

if [ -z "${APP_KEY:-}" ]; then
  # No key supplied: mint one for this container's lifetime. Sessions/cookies reset on restart.
  APP_KEY="$(php artisan key:generate --show)"
  export APP_KEY
  echo "[halka] APP_KEY was empty - generated a temporary key. Set APP_KEY to keep sessions across restarts."
fi

mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

# migrate is idempotent; DatabaseSeeder exits early once a user exists.
php artisan migrate --force --seed --no-interaction
php artisan optimize --no-interaction

exec "$@"
