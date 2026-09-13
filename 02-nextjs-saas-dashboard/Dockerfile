# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `npm run build` also runs scripts/postbuild.mjs, which copies .next/static + public into .next/standalone
RUN npm run build

# ---- run (standalone output) ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3002 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/app/data
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs \
    && mkdir -p /app/data && chown nextjs:nodejs /app/data
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
USER nextjs
EXPOSE 3002
# db.json is auto-created + seeded here on first request; mount a volume to persist it
VOLUME ["/app/data"]
CMD ["node", "server.js"]
