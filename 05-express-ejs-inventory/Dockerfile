FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3005 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/data && chown -R app:app /app/data
USER app
EXPOSE 3005
# inventory.json is auto-created + seeded here on first start; mount a volume to persist it
VOLUME ["/app/data"]
CMD ["node", "server.js"]
