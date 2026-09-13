FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DATABASE_PATH=/app/data/scribble.db

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p /app/data

VOLUME ["/app/data"]
EXPOSE 5004

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5004/healthz').status==200 else 1)"

# Tables are created and demo data seeded automatically inside create_app().
CMD ["sh", "-c", "exec gunicorn -b 0.0.0.0:${PORT:-5004} --workers ${GUNICORN_WORKERS:-2} --access-logfile - 'app:create_app()'"]
