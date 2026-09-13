#!/bin/sh
# Container entrypoint: migrate -> collectstatic -> idempotent seed -> gunicorn.
set -e

cd /app
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear
python manage.py seed_demo

exec gunicorn pergament.wsgi:application \
  --bind 0.0.0.0:${PORT:-8003} \
  --workers ${GUNICORN_WORKERS:-2} \
  --access-logfile - \
  --error-logfile -
