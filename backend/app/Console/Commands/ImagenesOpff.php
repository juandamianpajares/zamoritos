<?php

namespace App\Console\Commands;

use App\Models\Producto;
use App\Services\ImagenService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * php artisan imagenes:opff
 *
 * Consulta Open Pet Food Facts (world.openpetfoodfacts.org) para cada
 * producto con código de barras real (no ZAM) y descarga la foto frontal
 * si existe en la base de datos abierta.
 *
 * Opciones:
 *   --dry-run   Mostrar matches sin descargar nada
 *   --force     Reemplazar fotos ya existentes
 *   --limite=N  Procesar solo los primeros N productos (útil para pruebas)
 */
class ImagenesOpff extends Command
{
    protected $signature = 'imagenes:opff
                            {--dry-run  : Ver matches sin descargar}
                            {--force    : Reemplazar fotos ya existentes}
                            {--limite=  : Limitar cantidad de productos a procesar}';

    protected $description = 'Descarga imágenes desde Open Pet Food Facts por código de barras.';

    private const API_URL = 'https://world.openpetfoodfacts.org/api/v0/product/{code}.json';

    public function handle(ImagenService $img): int
    {
        $dryRun = $this->option('dry-run');
        $force  = $this->option('force');
        $limite = $this->option('limite') ? (int) $this->option('limite') : null;

        // Solo productos con código de barras real (no ZAM26XXX)
        $query = Producto::where('activo', true)
            ->whereNotNull('codigo_barras')
            ->where('codigo_barras', 'not like', 'ZAM%')
            ->when(!$force, fn($q) => $q->whereNull('foto'))
            ->select('id', 'nombre', 'codigo_barras', 'foto', 'thumb');

        if ($limite) $query->limit($limite);

        $productos = $query->get();

        if ($productos->isEmpty()) {
            $this->info('No hay productos con código de barras sin foto. Usá --force para reemplazar existentes.');
            return 0;
        }

        $this->info("Consultando Open Pet Food Facts para {$productos->count()} productos...");
        if ($dryRun) $this->warn('MODO DRY-RUN — no se descargará nada');
        $this->newLine();

        $ok = 0; $noEncontrado = 0; $errores = 0;

        foreach ($productos as $producto) {
            $code = $producto->codigo_barras;

            try {
                $response = Http::timeout(10)->get(
                    str_replace('{code}', $code, self::API_URL)
                );

                if (!$response->ok()) {
                    $this->line("<fg=yellow>HTTP {$response->status()}</>  {$producto->nombre} ({$code})");
                    $noEncontrado++;
                    continue;
                }

                $data   = $response->json();
                $status = $data['status'] ?? 0;

                if ($status !== 1) {
                    $this->line("<fg=yellow>NO ENCONTRADO</>  {$producto->nombre} ({$code})");
                    $noEncontrado++;
                    continue;
                }

                $imageUrl = $data['product']['image_front_url']
                    ?? $data['product']['image_url']
                    ?? null;

                if (!$imageUrl) {
                    $this->line("<fg=yellow>SIN IMAGEN</>     {$producto->nombre} ({$code})");
                    $noEncontrado++;
                    continue;
                }

                if ($dryRun) {
                    $this->line("<fg=green>ENCONTRADO</>   {$producto->nombre} → {$imageUrl}");
                    $ok++;
                    continue;
                }

                // Descargar imagen a tmp
                $imgResponse = Http::timeout(20)->get($imageUrl);
                if (!$imgResponse->ok()) {
                    $this->line("<fg=red>ERROR DESCARGA</>  {$producto->nombre}: HTTP {$imgResponse->status()}");
                    $errores++;
                    continue;
                }

                $tmpPath = sys_get_temp_dir() . "/opff_{$code}.jpg";
                file_put_contents($tmpPath, $imgResponse->body());

                // Borrar fotos viejas si existen
                if ($producto->foto)  Storage::disk('public')->delete($producto->foto);
                if ($producto->thumb) Storage::disk('public')->delete($producto->thumb);

                $slug  = $img->slug($code);
                $paths = $img->guardarProducto($tmpPath, $slug);
                unlink($tmpPath);

                $producto->update(['foto' => $paths['foto'], 'thumb' => $paths['thumb']]);
                $this->line("<fg=green>OK</>  {$producto->nombre} ({$code})");
                $ok++;

            } catch (\Throwable $e) {
                $this->line("<fg=red>ERROR</>  {$producto->nombre} ({$code}): {$e->getMessage()}");
                $errores++;
            }

            // Pequeña pausa para no saturar la API
            usleep(200_000); // 200ms
        }

        $this->newLine();
        $this->table(
            ['Resultado', 'Cantidad'],
            [
                ['✓ Con imagen',      $ok],
                ['? Sin datos OPFF',  $noEncontrado],
                ['✗ Errores',         $errores],
            ]
        );

        $this->newLine();
        $this->line('<fg=cyan>También probá Open Food Facts (productos humanos que a veces incluye mascotas):</>');
        $this->line('  Cambiá openpetfoodfacts → openfoodfacts en la URL del comando si hay pocos resultados.');

        return $errores > 0 ? 1 : 0;
    }
}
