<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Resetea datos operativos dejando intacto el catálogo.
 *
 * Borra:  ventas, detalle_ventas, movimientos_stock, lotes,
 *         compras, detalle_compras, pagos_proveedores, arqueos_caja
 * Resetea: productos.stock = 0, productos.monto_pagado = 0
 * Conserva: productos, categorias, proveedores, marcas, usuarios
 *
 * Uso:
 *   php artisan sistema:reset
 *   php artisan sistema:reset --force   (sin confirmación interactiva)
 */
class SistemaReset extends Command
{
    protected $signature = 'sistema:reset {--force : Saltar confirmación}';
    protected $description = 'Resetea stock y operaciones (ventas/compras/caja) conservando el catálogo.';

    public function handle(): int
    {
        if (!$this->option('force')) {
            $this->warn('⚠  Este comando borrará TODAS las ventas, compras, movimientos de stock y arqueos.');
            $this->warn('   Los productos, categorías y proveedores se conservan con stock = 0.');
            if (!$this->confirm('¿Confirmar reset operacional?')) {
                $this->info('Cancelado.');
                return 0;
            }
        }

        $this->info('Reseteando datos operativos…');

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        $tablas = [
            'detalle_ventas',
            'ventas',
            'movimientos_stock',
            'lotes',
            'detalle_compras',
            'pagos_proveedores',
            'compras',
            'arqueos_caja',
        ];

        foreach ($tablas as $tabla) {
            if (DB::getSchemaBuilder()->hasTable($tabla)) {
                DB::table($tabla)->truncate();
                $this->line("  ✓ <fg=green>{$tabla}</> truncada");
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // Reset stock y campos financieros en productos
        $n = DB::table('productos')->update([
            'stock'        => 0,
            'monto_pagado' => 0,
        ]);
        $this->line("  ✓ <fg=green>{$n} productos</> con stock → 0");

        $this->newLine();
        $this->info('✅ Reset completado. El catálogo de productos está intacto.');
        $this->line('   Cargá stock vía <fg=yellow>Compras</> en la interfaz.');

        return 0;
    }
}
