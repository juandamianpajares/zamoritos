<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Estrategia de imágenes Zamoritos
 * ─────────────────────────────────
 * Estructura en storage/app/public/:
 *   productos/{slug}.jpg          → imagen principal  (800×800 max, JPG 85%)
 *   productos/thumbs/{slug}.jpg   → thumbnail         (200×200 recortado centro, JPG 75%)
 *   categorias/{slug}.jpg         → thumb categoría   (400×200 recortado centro, JPG 80%)
 *
 * Requisitos de imagen de entrada:
 *   - Formatos:   JPG, PNG, WebP, GIF
 *   - Tamaño:     máx 8 MB
 *   - Dimensiones mínimas: 200×200 px
 *   - Recomendado: cuadrada 800×800 px, fondo blanco
 */
class ImagenService
{
    // ── Tamaños objetivo ──────────────────────────────────────────────────────
    const PROD_W     = 800;
    const PROD_H     = 800;
    const THUMB_W    = 200;
    const THUMB_H    = 200;
    const CAT_W      = 400;
    const CAT_H      = 200;

    // ── Calidad JPEG ─────────────────────────────────────────────────────────
    const Q_PROD  = 85;
    const Q_THUMB = 75;
    const Q_CAT   = 80;

    // ── Requisitos para el usuario ───────────────────────────────────────────
    const REQUISITOS = [
        'formatos'    => ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        'max_mb'      => 8,
        'min_px'      => 200,
        'recomendado' => '800×800 px, fondo blanco, formato JPG',
        'naming'      => 'Usar código de barras como nombre de archivo. Ej: 7730918030044.jpg',
    ];

    /**
     * Procesa y guarda imagen de producto.
     * Devuelve ['foto' => path_principal, 'thumb' => path_thumb]
     */
    public function guardarProducto(string $tmpPath, string $slug): array
    {
        $gd = $this->cargar($tmpPath);

        // Principal: fit dentro de 800×800 con fondo blanco
        $principal = $this->fitConFondo($gd, self::PROD_W, self::PROD_H);
        $pathPrincipal = "productos/{$slug}.jpg";
        Storage::disk('public')->put($pathPrincipal, $this->toJpeg($principal, self::Q_PROD));
        imagedestroy($principal);

        // Thumbnail: crop centrado 200×200
        $thumb = $this->cropCentrado($gd, self::THUMB_W, self::THUMB_H);
        $pathThumb = "productos/thumbs/{$slug}.jpg";
        Storage::disk('public')->put($pathThumb, $this->toJpeg($thumb, self::Q_THUMB));
        imagedestroy($thumb);

        imagedestroy($gd);

        return ['foto' => $pathPrincipal, 'thumb' => $pathThumb];
    }

    /**
     * Genera thumbnail de categoría (400×200 crop centrado).
     */
    public function guardarCategoria(string $tmpPath, string $slug): string
    {
        $gd   = $this->cargar($tmpPath);
        $cat  = $this->cropCentrado($gd, self::CAT_W, self::CAT_H);
        $path = "categorias/{$slug}.jpg";
        Storage::disk('public')->put($path, $this->toJpeg($cat, self::Q_CAT));
        imagedestroy($cat);
        imagedestroy($gd);
        return $path;
    }

    /**
     * Genera un slug a partir del nombre/código de barras.
     */
    public function slug(string $valor): string
    {
        return Str::slug($valor, '_');
    }

    /**
     * Carga imagen desde path de sistema de archivos → recurso GD.
     */
    private function cargar(string $path): \GdImage
    {
        $mime = mime_content_type($path);
        return match (true) {
            str_contains($mime, 'png')  => imagecreatefrompng($path),
            str_contains($mime, 'gif')  => imagecreatefromgif($path),
            str_contains($mime, 'webp') => imagecreatefromwebp($path),
            default                     => imagecreatefromjpeg($path),
        };
    }

    /**
     * Fit: escala manteniendo proporción, fondo blanco para áreas vacías.
     */
    private function fitConFondo(\GdImage $src, int $w, int $h): \GdImage
    {
        [$sw, $sh] = [imagesx($src), imagesy($src)];

        $ratio  = min($w / $sw, $h / $sh);
        $nw     = (int) round($sw * $ratio);
        $nh     = (int) round($sh * $ratio);
        $ox     = (int) round(($w - $nw) / 2);
        $oy     = (int) round(($h - $nh) / 2);

        $dst = imagecreatetruecolor($w, $h);
        imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
        imagecopyresampled($dst, $src, $ox, $oy, 0, 0, $nw, $nh, $sw, $sh);
        return $dst;
    }

    /**
     * Crop centrado: recorta y escala al tamaño exacto.
     */
    private function cropCentrado(\GdImage $src, int $w, int $h): \GdImage
    {
        [$sw, $sh] = [imagesx($src), imagesy($src)];

        $ratio  = max($w / $sw, $h / $sh);
        $nw     = (int) round($sw * $ratio);
        $nh     = (int) round($sh * $ratio);
        $cx     = (int) round(($nw - $w) / 2);
        $cy     = (int) round(($nh - $h) / 2);

        $scaled = imagecreatetruecolor($nw, $nh);
        imagefill($scaled, 0, 0, imagecolorallocate($scaled, 255, 255, 255));
        imagecopyresampled($scaled, $src, 0, 0, 0, 0, $nw, $nh, $sw, $sh);

        $dst = imagecreatetruecolor($w, $h);
        imagecopy($dst, $scaled, 0, 0, $cx, $cy, $w, $h);
        imagedestroy($scaled);
        return $dst;
    }

    /**
     * Convierte GdImage → string JPEG en memoria.
     */
    private function toJpeg(\GdImage $img, int $quality): string
    {
        ob_start();
        imagejpeg($img, null, $quality);
        return ob_get_clean();
    }
}
