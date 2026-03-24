#!/bin/bash
# zamoritos-start.sh – arranca el stack en WSL con Docker Desktop
set -e

# Hereda el PATH completo del usuario (Docker Desktop lo inyecta aquí)
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export PATH="$HOME/.docker/bin:$PATH"

COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Busca docker en orden de prioridad
DOCKER=""
for candidate in \
    "$HOME/.docker/bin/docker" \
    "/usr/local/bin/docker" \
    "/usr/bin/docker" \
    "$(command -v docker 2>/dev/null)"
do
    if [ -x "$candidate" ]; then
        DOCKER="$candidate"
        break
    fi
done

if [ -z "$DOCKER" ]; then
    echo "ERROR: docker no encontrado" >&2
    exit 1
fi

# Espera a que Docker Desktop esté listo
echo "Esperando Docker Desktop..."
until "$DOCKER" info >/dev/null 2>&1; do
    sleep 2
done

cd "$COMPOSE_DIR"
echo "Arrancando stack en $COMPOSE_DIR ..."

# Intenta compose v2 (plugin), si no cae a v1 standalone
if "$DOCKER" compose version >/dev/null 2>&1; then
    "$DOCKER" compose up -d --remove-orphans
elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose up -d --remove-orphans
else
    echo "ERROR: ni 'docker compose' ni 'docker-compose' disponibles" >&2
    exit 1
fi

echo "Stack arrancado."
