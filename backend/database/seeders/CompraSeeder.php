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

class CompraSeeder extends Seeder
{
    public function run(): void
    {
        $proveedor    = Proveedor::first();
        $provGranos   = Proveedor::where('nombre', 'like', '%Granos%')->first() ?? $proveedor;

        // Helper: obtiene producto por codigo_barras
        $prod = fn(string $codigo) => Producto::where('codigo_barras', $codigo)->first();

        // Compras del CSV agrupadas por comprobante/factura
        // "Precio Venta" en filas Compra = precio de costo unitario
        $compras = [
            ['factura' => 'A701829', 'fecha' => '2026-03-11', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '8445290068798', 'cantidad' => 1, 'costo' => 3307],
            ]],
            ['factura' => 'A11096', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7730900660259', 'cantidad' => 1, 'costo' => 1990],
                ['codigo' => '7898349703637', 'cantidad' => 1, 'costo' => 280],
            ]],
            ['factura' => 'A11097', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7730900660761', 'cantidad' => 1, 'costo' => 1208],
            ]],
            ['factura' => 'A11098', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7898224825096', 'cantidad' => 1, 'costo' => 140],
                ['codigo' => '7898224823122', 'cantidad' => 1, 'costo' => 132],
            ]],
            ['factura' => 'A11099', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7896588948253', 'cantidad' => 1, 'costo' => 480],
                ['codigo' => '7896588948246', 'cantidad' => 1, 'costo' => 205],
            ]],
            ['factura' => 'A11101', 'fecha' => '2026-03-13', 'proveedor' => $provGranos, 'detalles' => [
                ['codigo' => 'RAC016',        'cantidad' => 1, 'costo' => 68],
                ['codigo' => '7730906561017', 'cantidad' => 1, 'costo' => 83],
            ]],
            ['factura' => 'A11102', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7730944740276', 'cantidad' => 1, 'costo' => 685],
            ]],
            ['factura' => 'A11103', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => 'ND14228',       'cantidad' => 1, 'costo' => 826],
            ]],
            ['factura' => 'A11104', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7730900660761', 'cantidad' => 1, 'costo' => 1208],
                ['codigo' => '7730918030846', 'cantidad' => 1, 'costo' => 860],
            ]],
            ['factura' => 'A11105', 'fecha' => '2026-03-13', 'proveedor' => $provGranos, 'detalles' => [
                ['codigo' => 'RAC023',        'cantidad' => 1, 'costo' => 81],
                ['codigo' => '7730906560942', 'cantidad' => 1, 'costo' => 60],
            ]],
            ['factura' => 'A11106', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7898363312716', 'cantidad' => 1, 'costo' => 20],
            ]],
            ['factura' => 'A11107', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7898939952957', 'cantidad' => 1, 'costo' => 173],
            ]],
            ['factura' => 'A11108', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '675',           'cantidad' => 1, 'costo' => 438],
            ]],
            ['factura' => 'A11109', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7730918031102', 'cantidad' => 1, 'costo' => 1650],
            ]],
            ['factura' => 'A11110', 'fecha' => '2026-03-13', 'proveedor' => $provGranos, 'detalles' => [
                ['codigo' => 'RAC024',        'cantidad' => 1, 'costo' => 56],
            ]],
            ['factura' => 'A11111', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7896588948253', 'cantidad' => 1, 'costo' => 480],
                ['codigo' => '7898939952957', 'cantidad' => 1, 'costo' => 650],
            ]],
            ['factura' => 'A11112', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7898510459080', 'cantidad' => 1, 'costo' => 205],
            ]],
            ['factura' => 'A11113', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7896588939138', 'cantidad' => 1, 'costo' => 368],
            ]],
            ['factura' => 'A11114', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7896803080102', 'cantidad' => 1, 'costo' => 2191],
            ]],
            ['factura' => 'A11115', 'fecha' => '2026-03-13', 'proveedor' => $proveedor, 'detalles' => [
                ['codigo' => '7896588952106', 'cantidad' => 1, 'costo' => 310],
            ]],
            ['factura' => 'A11118', 'fecha' => '2026-03-13', 'proveedor' => $provGranos, 'detalles' => [
                ['codigo' => 'RAC023',        'cantidad' => 1, 'costo' => 135],
                ['codigo' => '7896588952106', 'cantidad' => 1, 'costo' => 310],
            ]],
        ];

        foreach ($compras as $c) {
            DB::transaction(function () use ($c, $prod) {
                $detalles = collect($c['detalles'])
                    ->map(fn($d) => array_merge($d, ['producto' => $prod($d['codigo'])]))
                    ->filter(fn($d) => $d['producto'] !== null)
                    ->values();

                if ($detalles->isEmpty()) return;

                $total  = $detalles->sum(fn($d) => $d['cantidad'] * $d['costo']);
                $compra = Compra::create([
                    'proveedor_id' => $c['proveedor']?->id,
                    'fecha'        => $c['fecha'],
                    'factura'      => $c['factura'],
                    'usuario'      => 'admin',
                    'total'        => $total,
                ]);

                foreach ($detalles as $d) {
                    $producto = $d['producto'];
                    $subtotal = $d['cantidad'] * $d['costo'];

                    DetalleCompra::create([
                        'compra_id'     => $compra->id,
                        'producto_id'   => $producto->id,
                        'cantidad'      => $d['cantidad'],
                        'precio_compra' => $d['costo'],
                        'subtotal'      => $subtotal,
                    ]);

                    $producto->increment('stock', $d['cantidad']);

                    MovimientoStock::create([
                        'producto_id' => $producto->id,
                        'tipo'        => 'ingreso',
                        'cantidad'    => $d['cantidad'],
                        'referencia'  => 'compra #' . $compra->id,
                        'usuario'     => 'admin',
                        'observacion' => 'Factura: ' . $c['factura'],
                    ]);

                    Lote::create([
                        'producto_id'       => $producto->id,
                        'compra_id'         => $compra->id,
                        'cantidad'          => $d['cantidad'],
                        'cantidad_restante' => $d['cantidad'],
                        'fecha_vencimiento' => null,
                    ]);
                }
            });
        }
    }
}
