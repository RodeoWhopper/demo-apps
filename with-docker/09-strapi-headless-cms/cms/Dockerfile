# Strapi 5 (TypeScript, SQLite). Single stage: better-sqlite3/sharp need build tools on musl.
FROM node:22-alpine

RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /opt/app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# devDependencies (typescript) are required by `strapi build`
RUN npm ci --include=dev && npm cache clean --force

COPY . .
RUN npm run build \
 && mkdir -p .tmp public/uploads \
 && chown -R node:node /opt/app

USER node
EXPOSE 1337
VOLUME ["/opt/app/.tmp", "/opt/app/public/uploads"]
CMD ["npm", "run", "start"]
