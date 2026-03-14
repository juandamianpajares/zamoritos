<?php

namespace Database\Seeders;

use App\Models\Producto;
use App\Services\VentaService;
use Illuminate\Database\Seeder;

class VentaSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(VentaService::class);

        // Helper: obtiene producto por codigo_barras
        $prod = fn(string $codigo) => Producto::where('codigo_barras', $codigo)->first();

        // Ventas y Ventas Sueltas del CSV
        // "Precio Venta" = precio de venta unitario real
        $ventas = [
            // A11096: Venta – cat litter lavanda
            ['fecha' => '2026-03-13', 'tipo_pago' => 'contado', 'medio_pago' => 'efectivo', 'obs' => 'Comp: A11096', 'detalles' => [
                ['codigo' => '6970216830958', 'cantidad' => 1, 'precio' => 240],
            ]],
            // A11100: Venta Suelta – ponedora
            ['fecha' => '2026-03-13', 'tipo_pago' => 'contado', 'medio_pago' => 'efectivo', 'obs' => 'Comp: A11100', 'detalles' => [
                ['codigo' => 'RAC004', 'cantidad' => 1, 'precio' => 35],
            ]],
            // A11102: Venta – maragata mix
            ['fecha' => '2026-03-13', 'tipo_pago' => 'contado', 'medio_pago' => 'efectivo', 'obs' => 'Comp: A11102', 'detalles' => [
                ['codigo' => 'RAC019', 'cantidad' => 1, 'precio' => 200],
            ]],
            // A11106: Venta Suelta – equilibrio gatito bebe
            ['fecha' => '2026-03-13', 'tipo_pago' => 'contado', 'medio_pago' => 'efectivo', 'obs' => 'Comp: A11106', 'detalles' => [
                ['codigo' => '7896588939138', 'cantidad' => 1, 'precio' => 170],
            ]],
            // A11110: Venta – conejo
            ['fecha' => '2026-03-13', 'tipo_pago' => 'contado', 'medio_pago' => 'efectivo', 'obs' => 'Comp: A11110', 'detalles' => [
                ['codigo' => 'RAC003', 'cantidad' => 1, 'precio' => 200],
            ]],
            // A11111: Venta – monello diversão
            ['fecha' => '2026-03-13', 'tipo_pago' => 'contado', 'medio_pago' => 'efectivo', 'obs' => 'Comp: A11111', 'detalles' => [
                ['codigo' => '7898349701442', 'cantidad' => 1, 'precio' => 180],
            ]],
            // A11116: Venta – cat litter rosas
            ['fecha' => '2026-03-13', 'tipo_pago' => 'contado', 'medio_pago' => 'efectivo', 'obs' => 'Comp: A11116', 'detalles' => [
                ['codigo' => '6970216830620', 'cantidad' => 1, 'precio' => 480],
            ]],
            // A11117: Venta – vittamax natural adulto
            ['fecha' => '2026-03-13', 'tipo_pago' => 'contado', 'medio_pago' => 'tarjeta', 'obs' => 'Comp: A11117', 'detalles' => [
                ['codigo' => '7898224827021', 'cantidad' => 1, 'precio' => 1598],
            ]],
        ];

        foreach ($ventas as $v) {
            $detalles = collect($v['detalles'])
                ->map(fn($d) => [
                    'producto'    => $prod($d['codigo']),
                    'cantidad'    => $d['cantidad'],
                    'precio'      => $d['precio'],
                ])
                ->filter(fn($d) => $d['producto'] !== null)
                ->map(fn($d) => [
                    'producto_id'     => $d['producto']->id,
                    'cantidad'        => $d['cantidad'],
                    'precio_unitario' => $d['precio'],
                ])
                ->values()
                ->toArray();

            if (empty($detalles)) continue;

            try {
                $service->registrar([
                    'fecha'       => $v['fecha'],
                    'tipo_pago'   => $v['tipo_pago'],
                    'medio_pago'  => $v['medio_pago'],
                    'usuario'     => 'admin',
                    'observacion' => $v['obs'],
                    'detalles'    => $detalles,
                ]);
            } catch (\Exception $e) {
                $this->command->warn("Venta omitida ({$v['obs']}): " . $e->getMessage());
            }
        }
    }
}
