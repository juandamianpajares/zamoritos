<?php

namespace App\Console\Commands;

use App\Models\Producto;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Corrige rutas de imágenes en la base de datos.
 *
 * Problema: fotos procesadas con ImagenService (WebP) quedaron con rutas .jpg
 * en la DB porque el archivo fue procesado antes de que ImagenService migrara a WebP,
 * o porque las rutas quedaron desincronizadas.
 *
 * Estrategia:
 *   1. Si el campo foto termina en .jpg y existe el .webp equivalente → actualizar a .webp
 *   2. Si el campo foto termina en .jpg y NO existe el .webp pero SÍ el .jpg → dejar como está
 *   3. Si el campo foto termina en .jpg y ninguno existe → limpiar el campo (foto = null)
 *
 * Uso:
 *   php artisan imagenes:fix-paths
 *   php artisan imagenes:fix-paths --dry-run
 */
class ImagenesFixPaths extends Command
{
    protected $signature = 'imagenes:fix-paths {--dry-run : Mostrar cambios sin aplicar}';
    protected $description = 'Corrige rutas .jpg → .webp en productos donde el archivo .webp existe en storage.';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('MODO DRY-RUN — no se modificará nada');
        }

        $productos = Producto::whereNotNull('foto')->get();

        $actualizados = 0;
        $limpiados    = 0;
        $ok           = 0;

        foreach ($productos as $producto) {
            $foto  = $producto->foto;
            $thumb = $producto->thumb;

            // Construir rutas webp equivalentes
            $fotoWebp  = $foto  ? preg_replace('/\.(jpg|jpeg)$/i', '.webp', $foto)  : null;
            $thumbWebp = $thumb ? preg_replace('/\.(jpg|jpeg)$/i', '.webp', $thumb) : null;

            $cambioFoto  = false;
            $cambioThumb = false;
            $newFoto     = $foto;
            $newThumb    = $thumb;

            // Verificar foto
            if ($foto && $fotoWebp && $foto !== $fotoWebp) {
                if (Storage::disk('public')->exists($fotoWebp)) {
                    // Existe el .webp → actualizar ruta
                    $cambioFoto = true;
                    $newFoto    = $fotoWebp;
                } elseif (!Storage::disk('public')->exists($foto)) {
                    // Ni .jpg ni .webp existen → limpiar
                    $cambioFoto = true;
                    $newFoto    = null;
                }
            } elseif ($foto && !Storage::disk('public')->exists($foto)) {
                // Ruta apunta a archivo inexistente (webp u otro) → limpiar
                $cambioFoto = true;
                $newFoto    = null;
            }

            // Verificar thumb
            if ($thumb && $thumbWebp && $thumb !== $thumbWebp) {
                if (Storage::disk('public')->exists($thumbWebp)) {
                    $cambioThumb = true;
                    $newThumb    = $thumbWebp;
                } elseif (!Storage::disk('public')->exists($thumb)) {
                    $cambioThumb = true;
                    $newThumb    = null;
                }
            } elseif ($thumb && !Storage::disk('public')->exists($thumb)) {
                $cambioThumb = true;
                $newThumb    = null;
            }

            if ($cambioFoto || $cambioThumb) {
                $accion = ($newFoto === null && $cambioFoto) ? 'LIMPIADO' : 'ACTUALIZADO';
                $this->line(
                    "<fg=" . ($accion === 'LIMPIADO' ? 'red' : 'green') . ">{$accion}</>  " .
                    "[{$producto->id}] {$producto->nombre}"
                );
                $this->line("     foto:  {$foto} → " . ($newFoto ?? 'null'));
                if ($cambioThumb) {
                    $this->line("     thumb: {$thumb} → " . ($newThumb ?? 'null'));
                }

                if (!$dryRun) {
                    $producto->update(['foto' => $newFoto, 'thumb' => $newThumb]);
                }

                $accion === 'LIMPIADO' ? $limpiados++ : $actualizados++;
            } else {
                $ok++;
            }
        }

        $this->newLine();
        $this->table(
            ['Resultado', 'Cantidad'],
            [
                ['✓ Ya correctos',   $ok],
                ['↺ Actualizados (.jpg→.webp)', $actualizados],
                ['✗ Limpiados (archivo no existe)', $limpiados],
            ]
        );

        if ($dryRun && ($actualizados + $limpiados) > 0) {
            $this->newLine();
            $this->warn('Ejecutá sin --dry-run para aplicar los cambios.');
        }

        return 0;
    }
}
