# ---- build: Vite production bundle ----------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- serve: nginx with SPA fallback ---------------------------------------------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8019
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8019/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
