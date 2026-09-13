# ---- stage 1: PHP dependencies -------------------------------------------
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress
COPY . .
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative --no-scripts

# ---- stage 2: runtime (php:8.3-cli ships pdo_sqlite + sqlite3) -----------
FROM php:8.3-cli
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

WORKDIR /var/www/html
COPY --from=vendor /app /var/www/html

RUN php artisan package:discover --ansi \
 && chmod +x docker/entrypoint.sh \
 && mkdir -p /data storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

ENV APP_NAME="Halka CRM" \
    APP_ENV=production \
    APP_DEBUG=false \
    APP_KEY= \
    APP_URL=http://localhost:8007 \
    DB_CONNECTION=sqlite \
    DB_DATABASE=/data/database.sqlite \
    SESSION_DRIVER=file \
    CACHE_STORE=file \
    QUEUE_CONNECTION=sync \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=info \
    PHP_CLI_SERVER_WORKERS=4

# SQLite file lives on /data so the rest of the app tree stays image-owned.
VOLUME ["/data"]
EXPOSE 8007
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD php -r 'exit(str_contains((string) @file_get_contents("http://127.0.0.1:8007/healthz"), "\"ok\"") ? 0 : 1);'

ENTRYPOINT ["docker/entrypoint.sh"]
# `artisan serve` (PHP built-in server, PHP_CLI_SERVER_WORKERS workers) is sufficient for this demo.
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8007", "--no-reload"]
