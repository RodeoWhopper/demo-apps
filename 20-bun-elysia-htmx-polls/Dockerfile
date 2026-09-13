# Pulsebox - Bun + Elysia + HTMX live polls
FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .
RUN mkdir -p data && chown -R bun:bun /app
USER bun

ENV APP_ENV=production \
    PORT=3020 \
    DB_PATH=/app/data/pulsebox.sqlite

VOLUME ["/app/data"]
EXPOSE 3020
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD bun -e 'fetch("http://127.0.0.1:3020/healthz").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'

CMD ["bun", "src/index.tsx"]
