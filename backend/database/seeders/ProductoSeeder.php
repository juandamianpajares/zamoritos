<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\ComboItem;
use App\Models\Producto;
use Illuminate\Database\Seeder;

/**
 * Catálogo ALIMENTOS — productos individuales + combos.
 *
 * Combos identificados por sufijo C u O en el código de barras:
 *   7730918030051C  → LAGER 22 + LAGER 10
 *   7898510456119C  → MANT NEGRA 22+2 + MANT NEGRA 7
 *   7898224823153C  → VITTAMAX 25 + VITTAMAX 10
 *   7898510458878C  → PREMIUM NARANJA 22+2 + PREMIUM NARANJA 10
 *   7730900660259C  → REALCAN 25 + REALCAN 8
 *   7730900660761O  → FORTACHON 25 × 2
 *
 * Ganancia = round((precio_venta / precio_compra - 1) * 100, 1)%
 */
class ProductoSeeder extends Seeder
{
    public function run(): void
    {
        $alimentos = Categoria::where('nombre', 'ALIMENTOS')->whereNull('parent_id')->value('id');
        $catCombo  = Categoria::where('nombre', 'COMBO')->whereNull('parent_id')->value('id');
        $catOferta = Categoria::where('nombre', 'OFERTA')->whereNull('parent_id')->value('id');

        // ── Productos individuales ────────────────────────────────────────────
        $items = [
            // codigo_barras             nombre                                   marca          peso  um        pc    pv
            ['7730918030051', 'LAGER 22',                              'LAGER',    22.0, 'unidad', 1163, 1887],
            ['7730918030044', 'LAGER 10',                              'LAGER',    10.0, 'unidad',  529, 1055],
            ['7898510456119', 'MANTENIMIENTO BOLSA NEGRA 20+2',        'PRIMOCAO', 22.0, 'unidad', 1426, 2240],
            ['7908320401046', 'MANTENIMIENTO BOLSA NEGRA 7',           'PRIMOCAO',  7.0, 'unidad',  454,  810],
            ['7898224823153', 'VITTAMAX CLASSIC 25',                   'VITTAMAX', 25.0, 'unidad', 1578, 2190],
            ['7898224824167', 'VITTAMAX CLASSIC 10',                   'VITTAMAX', 10.0, 'unidad',  697,  990],
            ['7898510458878', 'PREMIUM BOLSA NARANJA PROMO 20+2',      'PRIMOCAO', 22.0, 'unidad', 1988, 2563],
            ['7898510458854', 'PREMIUM BOLSA NARANJA 10',              'PRIMOCAO', 10.0, 'unidad',  904, 1248],
            ['7730900660259', 'REALCAN 25',                            'REALCAN',  25.0, 'unidad', 1174, 1594],
            ['7730900660648', 'REALCAN 8',                             'REALCAN',   8.0, 'unidad',  376,  586],
            ['7730900660761', 'FORTACHON 25',                          'FORTACHON',25.0, 'unidad',  805, 1208],
        ];

        foreach ($items as [$cod, $nom, $marca, $peso, $um, $pc, $pv]) {
            Producto::updateOrCreate(
                ['codigo_barras' => $cod],
                [
                    'nombre'        => $nom,
                    'marca'         => $marca,
                    'categoria_id'  => $alimentos,
                    'peso'          => $peso,
                    'unidad_medida' => $um,
                    'precio_compra' => $pc,
                    'precio_venta'  => $pv,
                    'stock'         => 0,
                    'fraccionable'  => false,
                    'es_combo'      => false,
                    'activo'        => true,
                ]
            );
        }

        // ── Combos y Ofertas ─────────────────────────────────────────────────
        // cat: 'combo'|'oferta' determina la categoría asignada
        $combos = [
            [
                'codigo'     => '7730918030051C',
                'nombre'     => 'LAGER COMBO 22+10',
                'marca'      => 'LAGER',
                'peso'       => 32.0,
                'pc'         => 1793,
                'pv'         => 2200,
                'cat'        => 'combo',
                'componentes'=> [['7730918030051', 1], ['7730918030044', 1]],
            ],
            [
                'codigo'     => '7898510456119C',
                'nombre'     => 'MANTENIMIENTO BOLSA NEGRA COMBO 22+7',
                'marca'      => 'PRIMOCAO',
                'peso'       => 29.0,
                'pc'         => 1880,
                'pv'         => 2493,
                'cat'        => 'combo',
                'componentes'=> [['7898510456119', 1], ['7908320401046', 1]],
            ],
            [
                'codigo'     => '7898224823153C',
                'nombre'     => 'VITTAMAX CLASSIC COMBO 25+10',
                'marca'      => 'VITTAMAX',
                'peso'       => 35.0,
                'pc'         => 2209,
                'pv'         => 2870,
                'cat'        => 'combo',
                'componentes'=> [['7898224823153', 1], ['7898224824167', 1]],
            ],
            [
                'codigo'     => '7898510458878C',
                'nombre'     => 'PREMIUM BOLSA NARANJA COMBO 22+10',
                'marca'      => 'PRIMOCAO',
                'peso'       => 32.0,
                'pc'         => 2892,
                'pv'         => 3300,
                'cat'        => 'combo',
                'componentes'=> [['7898510458878', 1], ['7898510458854', 1]],
            ],
            [
                'codigo'     => '7730900660259C',
                'nombre'     => 'REALCAN COMBO 25+8',
                'marca'      => 'REALCAN',
                'peso'       => 33.0,
                'pc'         => 1550,
                'pv'         => 1990,
                'cat'        => 'combo',
                'componentes'=> [['7730900660259', 1], ['7730900660648', 1]],
            ],
            [
                'codigo'     => '7730900660761O',
                'nombre'     => 'FORTACHON OFERTA 25+25',
                'marca'      => 'FORTACHON',
                'peso'       => 50.0,
                'pc'         => 1610,
                'pv'         => 2013,
                'cat'        => 'oferta',
                'componentes'=> [['7730900660761', 2]],
            ],
        ];

        foreach ($combos as $c) {
            $categoriaId = $c['cat'] === 'oferta' ? $catOferta : $catCombo;

            $combo = Producto::updateOrCreate(
                ['codigo_barras' => $c['codigo']],
                [
                    'nombre'        => $c['nombre'],
                    'marca'         => $c['marca'],
                    'categoria_id'  => $categoriaId,
                    'peso'          => $c['peso'],
                    'unidad_medida' => 'unidad',
                    'precio_compra' => $c['pc'],
                    'precio_venta'  => $c['pv'],
                    'stock'         => 0,
                    'fraccionable'  => false,
                    'es_combo'      => true,
                    'activo'        => true,
                ]
            );

            // Reconstruir combo_items (idempotente)
            ComboItem::where('combo_producto_id', $combo->id)->delete();

            foreach ($c['componentes'] as [$codComp, $qty]) {
                $comp = Producto::where('codigo_barras', $codComp)->first();
                if ($comp) {
                    ComboItem::create([
                        'combo_producto_id'      => $combo->id,
                        'componente_producto_id' => $comp->id,
                        'cantidad'               => $qty,
                    ]);
                }
            }
        }

        // Tabla resumen de ganancias (informativo — imprime en consola)
        $this->command->info(
            str_pad('Producto', 45) .
            str_pad('PC', 8)  .
            str_pad('PV', 8)  .
            'Ganancia%'
        );
        foreach (Producto::whereIn('codigo_barras', array_merge(
            array_column($items,   0),
            array_column($combos, 'codigo')
        ))->get() as $p) {
            if ($p->precio_compra > 0) {
                $pct = round(($p->precio_venta / $p->precio_compra - 1) * 100, 1);
                $this->command->line(
                    str_pad($p->nombre, 45) .
                    str_pad('$' . number_format($p->precio_compra, 0, ',', '.'), 8) .
                    str_pad('$' . number_format($p->precio_venta,  0, ',', '.'), 8) .
                    "{$pct}%"
                );
            }
        }
    }
}
