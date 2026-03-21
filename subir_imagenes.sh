#!/bin/bash
# Sube imágenes de productos al backend vía API.
#
# COMBOS: busca imagen por barcode (ej: 7730900660259-C.png → producto barcode 7730900660259C)
# EXCEL:  busca imagen por nombre del producto (filename sin extensión = nombre del producto)
#
# Requisitos: curl, jq
#   sudo apt install curl jq
#
# Uso:
#   ./subir_imagenes.sh                    # usa localhost:8000
#   ./subir_imagenes.sh http://mi-api.com  # URL del backend sin /api
#
# Para forzar resubida aunque el producto ya tenga foto: FORZAR=1 ./subir_imagenes.sh

API_BASE="${1:-http://localhost:8000}/api"
FORZAR="${FORZAR:-0}"

DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR_EXCEL="${DIR_SCRIPT}/imagenes_productos/EXCEL"
DIR_COMBOS="${DIR_SCRIPT}/imagenes_productos/COMBOS"

OK=0; SKIP=0; ERR=0

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'

# ── Verificar dependencias ─────────────────────────────────────────────────────
for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo -e "${RED}ERROR: '$cmd' no instalado. Instalá con: sudo apt install curl jq${NC}"
    exit 1
  fi
done

echo "=== Subida de imágenes de productos ==="
echo "  API: $API_BASE"
echo ""

# ── Cargar productos ───────────────────────────────────────────────────────────
echo "Obteniendo productos..."
PRODUCTOS=$(curl -sf "${API_BASE}/productos")
if [ -z "$PRODUCTOS" ] || echo "$PRODUCTOS" | jq -e 'type == "object" and has("message")' &>/dev/null; then
  echo -e "${RED}ERROR: No se pudo conectar a ${API_BASE}/productos${NC}"
  exit 1
fi
TOTAL_PROD=$(echo "$PRODUCTOS" | jq 'length')
echo "  $TOTAL_PROD productos cargados."
echo ""

# ── Subir imagen a un producto ─────────────────────────────────────────────────
subir_imagen() {
  local producto_id="$1"
  local archivo="$2"
  local nombre_display="$3"
  local tiene_foto="$4"

  if [ "$FORZAR" = "0" ] && [ -n "$tiene_foto" ]; then
    echo -e "  ${YELLOW}SKIP${NC}  $nombre_display (ya tiene foto)"
    SKIP=$((SKIP+1))
    return
  fi

  local respuesta
  respuesta=$(curl -sf -X POST "${API_BASE}/productos/${producto_id}/foto" \
    -F "foto=@${archivo}")

  if echo "$respuesta" | jq -e '.id' &>/dev/null; then
    echo -e "  ${GREEN}OK${NC}    $nombre_display"
    OK=$((OK+1))
  else
    echo -e "  ${RED}ERROR${NC} $nombre_display"
    ERR=$((ERR+1))
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# PARTE 1: COMBOS
# 7730900660259-C.png → busca producto con codigo_barras = "7730900660259C"
# ══════════════════════════════════════════════════════════════════════════════
if [ -d "$DIR_COMBOS" ]; then
  echo "─── COMBOS ───────────────────────────────────────────────────────────"
  while IFS= read -r archivo; do
    bname=$(basename "$archivo")
    sin_ext="${bname%.*}"
    # "7730900660259-C" → barcode base antes del guion
    barcode_base="${sin_ext%-*}"
    barcode_combo="${barcode_base}C"

    # Buscar por barcode combo (barcode + C)
    producto=$(echo "$PRODUCTOS" | jq -r --arg bc "$barcode_combo" \
      'first(.[] | select(.codigo_barras == $bc)) // empty')

    # Fallback: buscar por barcode base
    if [ -z "$producto" ]; then
      producto=$(echo "$PRODUCTOS" | jq -r --arg bc "$barcode_base" \
        'first(.[] | select(.codigo_barras == $bc)) // empty')
    fi

    if [ -z "$producto" ]; then
      echo -e "  ${YELLOW}N/F${NC}   $bname → barcode '$barcode_combo' no encontrado"
      ERR=$((ERR+1))
    else
      pid=$(echo "$producto" | jq -r '.id')
      pnombre=$(echo "$producto" | jq -r '.nombre')
      pfoto=$(echo "$producto" | jq -r '.foto // empty')
      subir_imagen "$pid" "$archivo" "$pnombre" "$pfoto"
    fi
  done < <(find "$DIR_COMBOS" -maxdepth 1 -type f \( -iname "*-C.*" -o -iname "*-O.*" \))
  echo ""
fi

# ══════════════════════════════════════════════════════════════════════════════
# PARTE 2: EXCEL
# "ADULTO LB.webp" → busca producto cuyo nombre coincida con "ADULTO LB"
# ══════════════════════════════════════════════════════════════════════════════
if [ -d "$DIR_EXCEL" ]; then
  echo "─── EXCEL ────────────────────────────────────────────────────────────"
  while IFS= read -r archivo; do
    bname=$(basename "$archivo")
    nombre_archivo="${bname%.*}"
    nombre_lower=$(echo "$nombre_archivo" | tr '[:upper:]' '[:lower:]')

    # Match exacto por nombre
    producto=$(echo "$PRODUCTOS" | jq -r --arg nm "$nombre_lower" \
      'first(.[] | select((.nombre | ascii_downcase) == $nm)) // empty')

    # Match parcial (el nombre del producto contiene el nombre del archivo)
    if [ -z "$producto" ]; then
      producto=$(echo "$PRODUCTOS" | jq -r --arg nm "$nombre_lower" \
        'first(.[] | select((.nombre | ascii_downcase) | contains($nm))) // empty')
    fi

    if [ -z "$producto" ]; then
      echo -e "  ${YELLOW}N/F${NC}   $bname"
    else
      pid=$(echo "$producto" | jq -r '.id')
      pnombre=$(echo "$producto" | jq -r '.nombre')
      pfoto=$(echo "$producto" | jq -r '.foto // empty')
      subir_imagen "$pid" "$archivo" "$pnombre" "$pfoto"
    fi
  done < <(find "$DIR_EXCEL" -maxdepth 1 -type f \
    \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" -o -iname "*.jfif" \) | sort)
  echo ""
fi

echo "═══════════════════════════════════"
echo "  Subidas:  $OK"
echo "  Saltadas: $SKIP  (ya tenían foto)"
echo "  Errores:  $ERR"
echo "═══════════════════════════════════"
