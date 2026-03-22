<?php

namespace App\Console\Commands;

use App\Models\Producto;
use App\Services\ImagenService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * php artisan imagenes:organizar {directorio}
 *
 * Escanea un directorio local de imágenes, intenta matchear cada archivo
 * con un producto (por código de barras o nombre), procesa la imagen con
 * ImagenService y guarda en storage/app/public/productos/.
 *
 * Naming esperado (en orden de prioridad):
 *   1. 7730918030044.jpg          → código de barras exacto
 *   2. lager_adulto_10kg.jpg      → slug del nombre del producto
 *   3. lager_7730918030044.jpg    → slug que contiene el código de barras
 */
class ImagenesOrganizar extends Command
{
    protected $signature   = 'imagenes:organizar {directorio : Ruta absoluta al directorio con imágenes}
                                                  {--dry-run : Mostrar matches sin procesar imágenes}';

    protected $description = 'Matchea imágenes del directorio con productos y las procesa con ImagenService.';

    private array $extensiones = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    public function handle(ImagenService $img): int
    {
        $dir = rtrim($this->argument('directorio'), DIRECTORY_SEPARATOR);

        if (!is_dir($dir)) {
            $this->error("El directorio no existe: {$dir}");
            return 1;
        }

        $dryRun = $this->option('dry-run');

        // Cargar todos los productos activos
        $productos = Producto::where('activo', true)
            ->select('id', 'nombre', 'codigo_barras', 'foto', 'thumb')
            ->get();

        $porCodigo = $productos->keyBy('codigo_barras');
        $porSlug   = $productos->keyBy(fn($p) => $img->slug($p->nombre));

        // Listar archivos de imagen
        $archivos = array_filter(
            scandir($dir),
            fn($f) => in_array(strtolower(pathinfo($f, PATHINFO_EXTENSION)), $this->extensiones)
        );

        if (empty($archivos)) {
            $this->warn('No se encontraron archivos de imagen en el directorio.');
            return 0;
        }

        $this->info(sprintf('Encontrados %d archivos. Procesando...', count($archivos)));

        $procesados = 0;
        $omitidos   = 0;
        $errores    = 0;

        foreach ($archivos as $archivo) {
            $nombre   = pathinfo($archivo, PATHINFO_FILENAME);
            $rutaFull = $dir . DIRECTORY_SEPARATOR . $archivo;

            // Matching
            $producto = $porCodigo->get($nombre);
            if (!$producto) $producto = $porSlug->get($img->slug($nombre));
            if (!$producto) {
                foreach ($porCodigo as $codigo => $p) {
                    if ($codigo && str_contains($nombre, (string) $codigo)) {
                        $producto = $p;
                        break;
                    }
                }
            }

            if (!$producto) {
                $this->line("<fg=yellow>SIN MATCH</> {$archivo}");
                $omitidos++;
                continue;
            }

            if ($dryRun) {
                $this->line("<fg=green>MATCH</> {$archivo} → {$producto->nombre} [{$producto->codigo_barras}]");
                $procesados++;
                continue;
            }

            try {
                if ($producto->foto)  Storage::disk('public')->delete($producto->foto);
                if ($producto->thumb) Storage::disk('public')->delete($producto->thumb);

                $slug  = $img->slug($producto->codigo_barras ?? (string) $producto->id);
                $paths = $img->guardarProducto($rutaFull, $slug);
                $producto->update(['foto' => $paths['foto'], 'thumb' => $paths['thumb']]);

                $this->line("<fg=green>OK</> {$archivo} → {$producto->nombre}");
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
