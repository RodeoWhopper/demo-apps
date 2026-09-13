# Bakkal Panel - vanilla PHP 8.3 on Apache, SQLite via PDO (bundled in the image).
FROM php:8.3-apache

# Production php.ini, mod_rewrite for the front controller, listen on 8006.
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
 && a2enmod rewrite headers \
 && rm /etc/apache2/sites-enabled/000-default.conf

COPY docker/ports.conf /etc/apache2/ports.conf
COPY docker/vhost.conf /etc/apache2/sites-available/bakkal.conf
RUN a2ensite bakkal

WORKDIR /var/www/html
COPY --chown=www-data:www-data . .

# Writable SQLite location (mount a volume here to persist data).
RUN mkdir -p data && chown -R www-data:www-data data
VOLUME ["/var/www/html/data"]

ENV APP_ENV=production \
    APP_KEY=change-me-demo-key \
    DB_PATH=/var/www/html/data/bakkal.sqlite

EXPOSE 8006
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD curl -fsS http://localhost:8006/healthz || exit 1
