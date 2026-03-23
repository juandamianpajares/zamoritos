<?php

namespace Database\Seeders;

use App\Models\Compra;
use App\Models\DetalleCompra;
use App\Models\Lote;
use App\Models\MovimientoStock;
use App\Models\Producto;
use App\Models\Proveedor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Compra inicial de apertura (stock semilla).
 *
 * Solo se crea si la factura 'APERTURA-2026' no existe (idempotente).
 * Incluye únicamente productos individuales (no combos) del catálogo ALIMENTOS.
 * Cantidades = 5 unidades por producto como stock inicial.
 *
 * Catálogo:
 *   codigo_barras         precio_compra  qty
 *   7730918030051  LAGER 22         1163   5
 *   7730918030044  LAGER 10          529   5
 *   7898510456119  MANT NEGRA 22+2  1426   5
 *   7908320401046  MANT NEGRA 7      454   5
 *   7898224823153  VITTAMAX 25      1578   5
 *   7898224824167  VITTAMAX 10       697   5
 *   7898510458878  PREMIUM NAR 22+2 1988   5
 *   7898510458854  PREMIUM NAR 10    904   5
 *   7730900660259  REALCAN 25       1174   5
 *   7730900660648  REALCAN 8         376   5
 *   7730900660761  FORTACHON 25      805   5
 */
class CompraSeeder extends Seeder
{
    public function run(): void
    {
        $factura = 'APERTURA-2026';

        if (Compra::where('factura', $factura)->exists()) {
            $this->command->info('CompraSeeder: compra inicial ya existe, omitida.');
            return;
        }

        $proveedor = Proveedor::where('activo', true)->first();

        // [codigo_barras, precio_compra, cantidad]
        $lineas = [
            ['7730918030051', 1163, 5],
            ['7730918030044',  529, 5],
            ['7898510456119', 1426, 5],
            ['7908320401046',  454, 5],
            ['7898224823153', 1578, 5],
            ['7898224824167',  697, 5],
            ['7898510458878', 1988, 5],
            ['7898510458854',  904, 5],
            ['7730900660259', 1174, 5],
            ['7730900660648',  376, 5],
            ['7730900660761',  805, 5],
        ];

        $detalles = [];
        foreach ($lineas as [$codigo, $pc, $qty]) {
            $producto = Producto::where('codigo_barras', $codigo)->first();
            if (!$producto) {
                $this->command->warn("Producto no encontrado: {$codigo}");
                continue;
            }
            $detalles[] = compact('producto', 'pc', 'qty');
        }

        if (empty($detalles)) {
            $this->command->warn('CompraSeeder: sin detalles, abortando.');
            return;
        }

        DB::transaction(function () use ($factura, $proveedor, $detalles) {
            $total = collect($detalles)->sum(fn($d) => $d['pc'] * $d['qty']);

            $compra = Compra::create([
                'proveedor_id' => $proveedor?->id,
                'fecha'        => '2026-01-01',
                'factura'      => $factura,
                'total'        => $total,
                'nota'         => 'Stock inicial de apertura',
            ]);

            foreach ($detalles as $d) {
                $subtotal = $d['pc'] * $d['qty'];

                DetalleCompra::create([
                    'compra_id'     => $compra->id,
                    'producto_id'   => $d['producto']->id,
                    'cantidad'      => $d['qty'],
                    'precio_compra' => $d['pc'],
                    'subtotal'      => $subtotal,
                ]);

                $d['producto']->increment('stock', $d['qty']);
                $d['producto']->update(['precio_compra' => $d['pc']]);

                MovimientoStock::create([
                    'producto_id' => $d['producto']->id,
                    'tipo'        => 'ingreso',
                    'cantidad'    => $d['qty'],
                    'referencia'  => 'compra #' . $compra->id,
                    'observacion' => 'Apertura stock inicial · ' . $factura,
                ]);

                Lote::create([
                    'producto_id'       => $d['producto']->id,
                    'compra_id'         => $compra->id,
                    'cantidad'          => $d['qty'],
                    'cantidad_restante' => $d['qty'],
                    'fecha_vencimiento' => null,
                ]);
            }
        });

        $this->command->info('CompraSeeder: stock inicial cargado — ' . count($detalles) . ' productos.');
    }
}
