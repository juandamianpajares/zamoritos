<?php

namespace App\Console\Commands;

use App\Models\Categoria;
use App\Services\ImagenService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * php artisan imagenes:thumbnails-categorias {directorio}
 *
 * Para cada imagen en el directorio que coincida con el slug o nombre
 * de una categoría raíz, genera un thumbnail 400×200 y lo guarda en
 * storage/app/public/categorias/{slug}.jpg.
 *
 * Naming esperado:
 *   alimentos.jpg, higiene.jpg, etc.
 */
class ImagenesThumbnailsCategorias extends Command
{
    protected $signature   = 'imagenes:thumbnails-categorias {directorio : Ruta absoluta al directorio con imágenes}
                                                               {--dry-run : Mostrar matches sin procesar}';

    protected $description = 'Genera thumbnails 400×200 para categorías raíz desde un directorio de imágenes.';

    private array $extensiones = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    public function handle(ImagenService $img): int
    {
        $dir = rtrim($this->argument('directorio'), DIRECTORY_SEPARATOR);

        if (!is_dir($dir)) {
            $this->error("El directorio no existe: {$dir}");
            return 1;
        }

        $dryRun = $this->option('dry-run');

        // Solo categorías raíz (sin parent)
        $categorias = Categoria::whereNull('parent_id')->get();
        $porSlug    = $categorias->keyBy(fn($c) => $img->slug($c->nombre));

        $archivos = array_filter(
            scandir($dir),
            fn($f) => in_array(strtolower(pathinfo($f, PATHINFO_EXTENSION)), $this->extensiones)
        );

        if (empty($archivos)) {
            $this->warn('No se encontraron archivos de imagen.');
            return 0;
        }

        $procesados = 0;
        $omitidos   = 0;
        $errores    = 0;

        foreach ($archivos as $archivo) {
            $nombre   = pathinfo($archivo, PATHINFO_FILENAME);
            $rutaFull = $dir . DIRECTORY_SEPARATOR . $archivo;
            $slug     = $img->slug($nombre);

            $categoria = $porSlug->get($slug);

            if (!$categoria) {
                $this->line("<fg=yellow>SIN MATCH</> {$archivo}");
                $omitidos++;
                continue;
            }

            if ($dryRun) {
                $this->line("<fg=green>MATCH</> {$archivo} → {$categoria->nombre}");
                $procesados++;
                continue;
            }

            try {
                $catSlug = $img->slug($categoria->nombre);

                // Borrar thumbnail anterior si existe
                Storage::disk('public')->delete("categorias/{$catSlug}.jpg");

                $path = $img->guardarCategoria($rutaFull, $catSlug);
                $categoria->update(['foto' => $path]);

                $this->line("<fg=green>OK</> {$archivo} → {$categoria->nombre}");
                $procesados++;
            } catch (\Throwable $e) {
                $this->line("<fg=red>ERROR</> {$archivo}: {$e->getMessage()}");
                $errores++;
            }
        }

        $this->newLine();
        $this->table(
            ['Resultado', 'Cantidad'],
            [
                ['Procesados', $procesados],
                ['Sin match',  $omitidos],
                ['Errores',    $errores],
            ]
        );

        return $errores > 0 ? 1 : 0;
    }
}
