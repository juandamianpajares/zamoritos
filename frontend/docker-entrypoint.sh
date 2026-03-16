#!/bin/sh
set -e

# Solo compila si no existe un build previo.
# Para forzar recompilación: docker-compose run --rm frontend sh -c "rm -rf .next && exit"
# o bien: make rebuild-frontend
if [ ! -f "/app/.next/BUILD_ID" ]; then
    echo "==> Compilando Next.js (primera vez o build limpio)..."
    npm run build
else
    echo "==> Build existente detectado. Saltando compilación."
    echo "    (Ejecuta 'make rebuild-frontend' para recompilar)"
fi

echo "==> Iniciando Next.js en modo producción..."
exec npm start
