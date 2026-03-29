#!/bin/bash
# Copia imágenes de imagenes_productos/ al servidor y las procesa con artisan.
#
# Convención: cada imagen debe llamarse con el código de barras del producto.
#   Ej: 7730918030044.webp  /  7730918030044.jpg
#
# Requisitos: ssh y scp sin contraseña hacia juan@localhost (WSL Debian)
#
# Uso:
#   ./subir_imagenes.sh
#   FORZAR=1 ./subir_imagenes.sh     # reemplaza fotos ya existentes
#   DRYRUN=1 ./subir_imagenes.sh     # muestra matches sin modificar nada

SSH_HOST="juan@localhost"
DEST_DIR="${DEST_DIR:-/mnt/c/Users/Juan/Documents/repos/zamoritos/imagenes-entrada}"
CONTAINER="zamoritos_backend"
FORZAR="${FORZAR:-0}"
DRYRUN="${DRYRUN:-0}"

DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR_IMAGENES="${DIR_SCRIPT}/imagenes_productos"

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'

echo "=== Subida de imágenes de productos ==="
echo "  Origen:  $DIR_IMAGENES"
echo "  Destino: ${SSH_HOST}:${DEST_DIR}"
echo ""

# ── Verificar directorio local ────────────────────────────────────────────────
if [ ! -d "$DIR_IMAGENES" ]; then
  echo -e "${RED}ERROR: no existe el directorio $DIR_IMAGENES${NC}"
  exit 1
fi

ARCHIVOS=$(find "$DIR_IMAGENES" -maxdepth 1 -type f \
  \( -iname "*.webp" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | sort)

if [ -z "$ARCHIVOS" ]; then
  echo -e "${YELLOW}No se encontraron imágenes en $DIR_IMAGENES${NC}"
  exit 0
fi

TOTAL=$(echo "$ARCHIVOS" | wc -l)
echo "  $TOTAL imágenes encontradas."
echo ""

# ── Crear directorio destino y copiar imágenes ────────────────────────────────
echo "Copiando al servidor..."
ssh "$SSH_HOST" "mkdir -p '$DEST_DIR'"

echo "$ARCHIVOS" | while IFS= read -r archivo; do
  scp -q "$archivo" "${SSH_HOST}:${DEST_DIR}/"
  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}OK${NC}  $(basename "$archivo")"
  else
    echo -e "  ${RED}ERR${NC} $(basename "$archivo")"
  fi
done

echo ""

# ── Ejecutar artisan dentro del contenedor ────────────────────────────────────
ARTISAN_FLAGS=""
[ "$FORZAR" = "1" ] && ARTISAN_FLAGS="$ARTISAN_FLAGS --force"
[ "$DRYRUN" = "1" ] && ARTISAN_FLAGS="$ARTISAN_FLAGS --dry-run"

echo "Procesando imágenes en el contenedor..."
ssh "$SSH_HOST" "docker exec $CONTAINER php artisan imagenes:organizar /var/imagenes $ARTISAN_FLAGS"
