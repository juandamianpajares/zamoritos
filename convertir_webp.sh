#!/bin/bash
# Convierte todas las imágenes JPG/PNG/JPEG de la carpeta actual a formato WebP
# Requiere: sudo apt install webp  (en WSL/Ubuntu)
#
# Uso:
#   chmod +x convertir_webp.sh
#   ./convertir_webp.sh                      # convierte la carpeta actual
#   ./convertir_webp.sh /ruta/a/imagenes     # convierte una carpeta específica
#   ./convertir_webp.sh . 85                 # con calidad personalizada (default: 85)

CARPETA="${1:-.}"
CALIDAD="${2:-85}"
CONVERTIDAS=0
ERRORES=0

echo "=== Convirtiendo imágenes en: $CARPETA (calidad: $CALIDAD) ==="

# Verificar que cwebp esté instalado
if ! command -v cwebp &> /dev/null; then
    echo "ERROR: cwebp no está instalado."
    echo "Instalá con: sudo apt install webp"
    exit 1
fi

# Buscar archivos JPG, JPEG y PNG (case insensitive)
find "$CARPETA" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r archivo; do
    # Nombre sin extensión
    nombre="${archivo%.*}"
    salida="${nombre}.webp"

    echo -n "  Convirtiendo: $(basename "$archivo") → $(basename "$salida") ... "

    if cwebp -q "$CALIDAD" "$archivo" -o "$salida" &> /dev/null; then
        echo "OK"
        CONVERTIDAS=$((CONVERTIDAS + 1))
    else
        echo "ERROR"
        ERRORES=$((ERRORES + 1))
    fi
done

echo ""
echo "=== Listo ==="
echo "  Convertidas: $CONVERTIDAS"
echo "  Errores:     $ERRORES"
