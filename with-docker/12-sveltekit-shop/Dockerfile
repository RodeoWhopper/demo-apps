# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- run ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3012 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data
RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/data && chown app:app /app/data
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server.js ./server.js
USER app
EXPOSE 3012
# JSON stores are auto-created + seeded here on first start; mount a volume to persist them
VOLUME ["/app/data"]
CMD ["node", "server.js"]
