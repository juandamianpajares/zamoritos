<?php

namespace App\Console\Commands;

use App\Models\Producto;
use App\Services\ImagenService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * php artisan imagenes:organizar {directorio}
 *
 * Convención estricta: cada imagen DEBE llamarse exactamente igual al
 * código de barras del producto con extensión .webp
 *
 *   Ejemplo correcto:   7730918030044.webp
 *   Ejemplo incorrecto: perro_lager.jpg  ← será rechazado
 *
 * Opciones:
 *   --dry-run   Muestra matches sin procesar ni modificar nada
 *   --force     Reemplaza fotos existentes (por defecto las omite)
 */
class ImagenesOrganizar extends Command
{
    protected $signature = 'imagenes:organizar
                            {directorio : Ruta absoluta al directorio con imágenes}
                            {--dry-run  : Mostrar resultado sin procesar}
                            {--force    : Reemplazar fotos ya existentes}';

    protected $description = 'Procesa imágenes {codigo_barras}.webp y las asigna a productos.';

    public function handle(ImagenService $img): int
    {
        $dir = rtrim($this->argument('directorio'), DIRECTORY_SEPARATOR);

        if (!is_dir($dir)) {
            $this->error("El directorio no existe: {$dir}");
            return 1;
        }

        $dryRun = $this->option('dry-run');
        $force  = $this->option('force');

        // Cargar todos los productos activos con código de barras
        $productos = Producto::where('activo', true)
            ->whereNotNull('codigo_barras')
            ->select('id', 'nombre', 'codigo_barras', 'foto', 'thumb')
            ->get()
            ->keyBy('codigo_barras');

        // Solo archivos .webp
        $archivos = array_values(array_filter(
            scandir($dir),
            fn($f) => strtolower(pathinfo($f, PATHINFO_EXTENSION)) === 'webp'
        ));

        if (empty($archivos)) {
            $this->warn('No se encontraron archivos .webp en el directorio.');
            $this->line("Convención esperada: <fg=yellow>{codigo_barras}.webp</>");
            return 0;
        }

        $this->info(sprintf('Encontrados %d archivos .webp', count($archivos)));
        if ($dryRun) $this->warn('MODO DRY-RUN — no se modificará nada');
        $this->newLine();

        $procesados = 0;
        $omitidos   = 0;
        $sinMatch   = 0;
        $errores    = 0;

        foreach ($archivos as $archivo) {
            $codigo   = pathinfo($archivo, PATHINFO_FILENAME);
            $rutaFull = $dir . DIRECTORY_SEPARATOR . $archivo;
            $producto = $productos->get($codigo);

            if (!$producto) {
                $this->line("<fg=yellow>SIN MATCH</>  {$archivo}  (código: {$codigo})");
                $sinMatch++;
                continue;
            }

            if ($producto->foto && !$force && !$dryRun) {
                $this->line("<fg=cyan>OMITIDO</>   {$archivo} → {$producto->nombre}  (ya tiene foto, usá --force)");
                $omitidos++;
                continue;
            }

            if ($dryRun) {
                $estado = $producto->foto ? '<fg=magenta>REEMPLAZARÍA</>' : '<fg=green>NUEVO</>';
                $this->line("{$estado}     {$archivo} → {$producto->nombre}");
                $procesados++;
                continue;
            }

            try {
                if ($producto->foto)  Storage::disk('public')->delete($producto->foto);
                if ($producto->thumb) Storage::disk('public')->delete($producto->thumb);

                $slug  = $img->slug($codigo);
                $paths = $img->guardarProducto($rutaFull, $slug);
                $producto->update(['foto' => $paths['foto'], 'thumb' => $paths['thumb']]);

                $this->line("<fg=green>OK</>         {$archivo} → {$producto->nombre}");
                $procesados++;
            } catch (\Throwable $e) {
                $this->line("<fg=red>ERROR</>      {$archivo}: {$e->getMessage()}");
                $errores++;
            }
        }

        $this->newLine();
        $this->table(
            ['Resultado', 'Cantidad'],
            [
                ['✓ Procesados',   $procesados],
                ['⊘ Omitidos',     $omitidos],
                ['? Sin match',    $sinMatch],
                ['✗ Errores',      $errores],
            ]
        );

        if ($sinMatch > 0) {
            $this->newLine();
            $this->warn("Los archivos sin match NO tienen un producto con ese código de barras.");
            $this->line("Verificá el código en <fg=yellow>/productos</> o renombrá el archivo.");
        }

        return $errores > 0 ? 1 : 0;
    }
}
