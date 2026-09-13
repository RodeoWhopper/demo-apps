# Control panel image. It drives the host's Docker daemon, so run it with the socket AND the repo
# mounted at the SAME absolute path as on the host (compose build contexts are resolved by the daemon):
#   docker build -t demo-apps/control-panel .
#   docker run -d --name demo-control-panel -p 8000:8000 \
#     -e HOST=0.0.0.0 -e PANEL_TOKEN=change-me -e DEMO_APPS_ROOT="$PWD/../with-docker" \
#     -v /var/run/docker.sock:/var/run/docker.sock -v "$PWD/..:$PWD/.." demo-apps/control-panel
FROM node:22-alpine
RUN apk add --no-cache docker-cli docker-cli-compose bash curl python3
WORKDIR /panel
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV PORT=8000 HOST=0.0.0.0 NODE_ENV=production
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD curl -fsS http://127.0.0.1:8000/healthz || exit 1
CMD ["node", "server.js"]
