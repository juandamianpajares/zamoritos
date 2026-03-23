<?php

namespace App\Console\Commands;

use App\Models\Categoria;
use App\Services\ImagenService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * php artisan iconos:categorias {directorio}
 *
 * Convención: el archivo debe llamarse con el nombre (o slug) de la categoría.
 *   Ejemplos válidos:
 *     perro.webp   → categoría "PERRO"
 *     gato.png     → categoría "GATO"
 *     higiene.jpg  → categoría "HIGIENE"
 *
 * Genera: storage/app/public/categorias/iconos/{slug}.png (128×128)
 * Opciones:
 *   --dry-run   Ver matches sin procesar
 *   --force     Reemplazar íconos existentes
 */
class IconosCategorias extends Command
{
    protected $signature = 'iconos:categorias
                            {directorio : Ruta absoluta al directorio con imágenes}
                            {--dry-run  : Mostrar resultado sin procesar}
                            {--force    : Reemplazar íconos ya existentes}';

    protected $description = 'Genera íconos 128×128 PNG para categorías desde imágenes fuente.';

    public function handle(ImagenService $img): int
    {
        $dir = rtrim($this->argument('directorio'), DIRECTORY_SEPARATOR);

        if (!is_dir($dir)) {
            $this->error("El directorio no existe: {$dir}");
            return 1;
        }

        $dryRun = $this->option('dry-run');
        $force  = $this->option('force');

        // Cargar todas las categorías indexadas por slug de nombre
        $categorias = Categoria::all()
            ->keyBy(fn($c) => Str::slug($c->nombre, '_'));

        $archivos = array_values(array_filter(
            scandir($dir),
            fn($f) => in_array(
                strtolower(pathinfo($f, PATHINFO_EXTENSION)),
                ['webp', 'jpg', 'jpeg', 'png']
            )
        ));

        if (empty($archivos)) {
            $this->warn('No se encontraron imágenes en el directorio.');
            $this->line("Formatos aceptados: <fg=yellow>webp, jpg, jpeg, png</>");
            return 0;
        }

        $this->info(sprintf('Encontrados %d archivos', count($archivos)));
        if ($dryRun) $this->warn('MODO DRY-RUN — no se modificará nada');
        $this->newLine();

        // Listar categorías disponibles para orientar al usuario
        if ($dryRun) {
            $this->line('<fg=cyan>Categorías disponibles (slug → nombre):</>');
            foreach ($categorias as $slug => $cat) {
                $this->line("  <fg=yellow>{$slug}</> → {$cat->nombre}");
            }
            $this->newLine();
        }

        $procesados = 0; $omitidos = 0; $sinMatch = 0; $errores = 0;

        foreach ($archivos as $archivo) {
            $slug      = Str::slug(pathinfo($archivo, PATHINFO_FILENAME), '_');
            $rutaFull  = $dir . DIRECTORY_SEPARATOR . $archivo;
            $categoria = $categorias->get($slug);

            if (!$categoria) {
                $this->line("<fg=yellow>SIN MATCH</>  {$archivo}  (slug: {$slug})");
                $sinMatch++;
                continue;
            }

            $iconPath = "categorias/iconos/{$slug}.png";
            if (Storage::disk('public')->exists($iconPath) && !$force && !$dryRun) {
                $this->line("<fg=cyan>OMITIDO</>   {$archivo} → {$categoria->nombre}  (ya tiene ícono, usá --force)");
                $omitidos++;
                continue;
            }

            if ($dryRun) {
                $estado = Storage::disk('public')->exists($iconPath) ? '<fg=magenta>REEMPLAZARÍA</>' : '<fg=green>NUEVO</>';
                $this->line("{$estado}     {$archivo} → {$categoria->nombre}");
                $procesados++;
                continue;
            }

            try {
                $path = $img->guardarIconoCategoria($rutaFull, $slug);
                $categoria->update(['foto' => $path]);
                $this->line("<fg=green>OK</>         {$archivo} → {$categoria->nombre}");
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
                ['✓ Procesados', $procesados],
                ['⊘ Omitidos',   $omitidos],
                ['? Sin match',  $sinMatch],
                ['✗ Errores',    $errores],
            ]
        );

        return $errores > 0 ? 1 : 0;
    }
}
