#!/bin/bash
set -e

cd /var/www/html

# ── Primera ejecución: crear proyecto Laravel ──────────────────────────────
if [ ! -f "artisan" ]; then
    echo "==> Creando proyecto Laravel en /tmp/laravel-app ..."
    composer create-project laravel/laravel /tmp/laravel-app --prefer-dist --no-interaction --quiet

    echo "==> Copiando archivos Laravel al directorio de trabajo ..."
    cp -r /tmp/laravel-app/. /var/www/html/
    rm -rf /tmp/laravel-app

    # Copiar migraciones personalizadas
    cp /src/migrations/*.php /var/www/html/database/migrations/

    # Copiar modelos
    cp /src/Models/*.php /var/www/html/app/Models/

    # Copiar controladores
    mkdir -p /var/www/html/app/Http/Controllers/Api
    cp /src/Http/Controllers/Api/*.php /var/www/html/app/Http/Controllers/Api/

    # Copiar services
    mkdir -p /var/www/html/app/Services
    cp /src/Services/*.php /var/www/html/app/Services/

    # Copiar rutas
    cp /src/routes/api.php /var/www/html/routes/api.php

    # Copiar config CORS
    cp /src/config/cors.php /var/www/html/config/cors.php

    # Copiar seeders
    mkdir -p /var/www/html/database/seeders
    cp /src/seeders/*.php /var/www/html/database/seeders/

    # .env
    cp .env.example .env
fi

# ── Configurar .env ────────────────────────────────────────────────────────
sed -i "s|^APP_URL=.*|APP_URL=http://localhost|" .env
sed -i "s|^DB_CONNECTION=.*|DB_CONNECTION=mysql|" .env
sed -i "s|^# DB_HOST=.*|DB_HOST=${DB_HOST:-db}|; s|^DB_HOST=.*|DB_HOST=${DB_HOST:-db}|" .env
sed -i "s|^# DB_PORT=.*|DB_PORT=${DB_PORT:-3306}|; s|^DB_PORT=.*|DB_PORT=${DB_PORT:-3306}|" .env
sed -i "s|^# DB_DATABASE=.*|DB_DATABASE=${DB_DATABASE:-zamoritos}|; s|^DB_DATABASE=.*|DB_DATABASE=${DB_DATABASE:-zamoritos}|" .env
sed -i "s|^# DB_USERNAME=.*|DB_USERNAME=${DB_USERNAME:-zamoritos}|; s|^DB_USERNAME=.*|DB_USERNAME=${DB_USERNAME:-zamoritos}|" .env
sed -i "s|^# DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD:-zamoritos_secret}|; s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD:-zamoritos_secret}|" .env

# ── Generar clave si no existe ─────────────────────────────────────────────
if ! grep -q "^APP_KEY=base64:" .env; then
    php artisan key:generate --force --no-interaction
fi

# ── Instalar dependencias si falta vendor ─────────────────────────────────
if [ ! -d "vendor" ]; then
    composer install --no-interaction --quiet
fi

# ── Esperar base de datos ──────────────────────────────────────────────────
echo "==> Esperando base de datos..."
until php artisan db:monitor --databases=mysql 2>/dev/null | grep -q "OK" || \
      php -r "new PDO('mysql:host=${DB_HOST:-db};port=${DB_PORT:-3306};dbname=${DB_DATABASE:-zamoritos}', '${DB_USERNAME:-zamoritos}', '${DB_PASSWORD:-zamoritos_secret}');" 2>/dev/null; do
    echo "   ... Base de datos no disponible aún, reintentando en 3s"
    sleep 3
done
echo "==> Base de datos lista."

# ── Migraciones y seeders (solo primera vez) ───────────────────────────────
SEEDED_FLAG="/var/www/html/storage/.seeded"
php artisan migrate --force --no-interaction
php artisan storage:link --force 2>/dev/null || true
if [ ! -f "$SEEDED_FLAG" ]; then
    php artisan db:seed --force --no-interaction && touch "$SEEDED_FLAG"
fi

echo "==> Iniciando PHP-FPM..."
exec "$@"
