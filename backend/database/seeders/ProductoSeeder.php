<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\ComboItem;
use App\Models\Producto;
use Illuminate\Database\Seeder;

/**
 * Catálogo ALIMENTOS — productos individuales + combos + ofertas.
 *
 * en_promo: 0=sin promo | 1=COMBO | 2=OFERTA | 3=REGALO
 *
 * Combos/Ofertas identificados por sufijo en código de barras:
 *   C → COMBO  (en_promo=1)
 *   O → OFERTA (en_promo=2)
 */
class ProductoSeeder extends Seeder
{
    public function run(): void
    {
        $alimentos   = Categoria::where('nombre', 'ALIMENTOS')->whereNull('parent_id')->value('id');
        $perro       = Categoria::where('nombre', 'PERRO')->where('parent_id', $alimentos)->value('id');
        $perroAdulto = Categoria::where('nombre', 'ADULTO')->where('parent_id', $perro)->value('id');
        $catCombo    = Categoria::where('nombre', 'COMBO')->whereNull('parent_id')->value('id');
        $catOferta   = Categoria::where('nombre', 'OFERTA')->whereNull('parent_id')->value('id');

        $catIndividual = $perroAdulto ?? $perro ?? $alimentos;

        // ── Productos individuales ────────────────────────────────────────────
        // [codigo_barras, nombre, marca, peso, um, precio_compra, precio_venta]
        $items = [
            ['7730918030051', 'LAGER 22',                         'LAGER',    22.0, 'unidad', 1163, 1887],
            ['7730918030044', 'LAGER 10',                         'LAGER',    10.0, 'unidad',  529, 1055],
            ['7898510456119', 'MANTENIMIENTO BOLSA NEGRA 20+2',   'PRIMOCAO', 22.0, 'unidad', 1426, 2240],
            ['7908320401046', 'MANTENIMIENTO BOLSA NEGRA 7',      'PRIMOCAO',  7.0, 'unidad',  454,  810],
            ['7898224823153', 'VITTAMAX CLASSIC',                 'VITTAMAX', 25.0, 'unidad', 1578, 2190],
            ['7898224824167', 'VITTAMAX CLASSIC',                 'VITTAMAX', 10.0, 'unidad',  697,  990],
            ['7898510458878', 'PREMIUM BOLSA NARANJA PROMO 20+2', 'PRIMOCAO', 22.0, 'unidad', 1988, 2563],
            ['7898510458854', 'PREMIUM BOLSA NARANJA 10',         'PRIMOCAO', 10.0, 'unidad',  904, 1248],
            ['7730900660259', 'REALCAN',                          'REALCAN',  25.0, 'unidad', 1174, 1594],
            ['7730900660648', 'REALCAN',                          'REALCAN',   8.0, 'unidad',  376,  586],
            ['7730900660761', 'FORTACHON 25',                     'FORTACHON',25.0, 'unidad',  805, 1208],
        ];

        foreach ($items as [$cod, $nom, $marca, $peso, $um, $pc, $pv]) {
            Producto::updateOrCreate(
                ['codigo_barras' => $cod],
                [
                    'nombre'        => $nom,
                    'marca'         => $marca,
                    'categoria_id'  => $catIndividual,
                    'peso'          => $peso,
                    'unidad_medida' => $um,
                    'precio_compra' => $pc,
                    'precio_venta'  => $pv,
                    'stock'         => 0,
                    'fraccionable'  => false,
                    'en_promo'      => 0,
                    'precio_promo'  => null,
                    'destacado'     => false,
                    'activo'        => true,
                ]
            );
        }

        // ── Combos y Ofertas ─────────────────────────────────────────────────
        // [codigo, nombre, marca, peso, pc, pv, en_promo, precio_promo, cat, destacado, componentes]
        $combos = [
            [
                'codigo'      => '7730918030051C',
                'nombre'      => 'LAGER COMBO 22+10',
                'marca'       => 'LAGER',
                'peso'        => 32.0,
                'pc'          => 1793,
                'pv'          => 2200,
                'en_promo'    => 1,
                'precio_promo'=> 2200,
                'cat'         => 'combo',
                'destacado'   => true,
                'componentes' => [['7730918030051', 1], ['7730918030044', 1]],
            ],
            [
                'codigo'      => '7898510456119C',
                'nombre'      => 'MANTENIMIENTO BOLSA NEGRA COMBO 22+7',
                'marca'       => 'PRIMOCAO',
                'peso'        => 29.0,
                'pc'          => 1880,
                'pv'          => 2493,
                'en_promo'    => 1,
                'precio_promo'=> 2493,
                'cat'         => 'combo',
                'destacado'   => true,
                'componentes' => [['7898510456119', 1], ['7908320401046', 1]],
            ],
            [
                'codigo'      => '7898224823153C',
                'nombre'      => 'VITTAMAX CLASSIC COMBO 25+10',
                'marca'       => 'VITTAMAX',
                'peso'        => 35.0,
                'pc'          => 2209,
                'pv'          => 2870,
                'en_promo'    => 1,
                'precio_promo'=> 2870,
                'cat'         => 'combo',
                'destacado'   => true,
                'componentes' => [['7898224823153', 1], ['7898224824167', 1]],
            ],
            [
                'codigo'      => '7898510458878C',
                'nombre'      => 'PREMIUM BOLSA NARANJA COMBO 22+10',
                'marca'       => 'PRIMOCAO',
                'peso'        => 32.0,
                'pc'          => 2892,
                'pv'          => 3300,
                'en_promo'    => 1,
                'precio_promo'=> 3300,
                'cat'         => 'combo',
                'destacado'   => true,
                'componentes' => [['7898510458878', 1], ['7898510458854', 1]],
            ],
            [
                'codigo'      => '7730900660259C',
                'nombre'      => 'REALCAN COMBO 25+8',
                'marca'       => 'REALCAN',
                'peso'        => 33.0,
                'pc'          => 1550,
                'pv'          => 1990,
                'en_promo'    => 1,
                'precio_promo'=> 1990,
                'cat'         => 'combo',
                'destacado'   => true,
                'componentes' => [['7730900660259', 1], ['7730900660648', 1]],
            ],
            [
                'codigo'      => '7730900660761O',
                'nombre'      => 'FORTACHON OFERTA 25+25',
                'marca'       => 'FORTACHON',
                'peso'        => 50.0,
                'pc'          => 1610,
                'pv'          => 2013,
                'en_promo'    => 2,
                'precio_promo'=> 2013,
                'cat'         => 'oferta',
                'destacado'   => true,
                'componentes' => [['7730900660761', 2]],
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
                    'en_promo'      => $c['en_promo'],
                    'precio_promo'  => $c['precio_promo'],
                    'destacado'     => $c['destacado'],
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

        // Resumen en consola
        $this->command->info(str_pad('Producto', 48) . str_pad('PC', 8) . str_pad('PV', 8) . 'Margen%');
        foreach (Producto::whereIn('codigo_barras', array_merge(
            array_column($items, 0),
            array_column($combos, 'codigo')
        ))->get() as $p) {
            if ($p->precio_compra > 0) {
                $pct = round(($p->precio_venta / $p->precio_compra - 1) * 100, 1);
                $tag = $p->en_promo === 1 ? ' [COMBO]' : ($p->en_promo === 2 ? ' [OFERTA]' : '');
                $this->command->line(
                    str_pad($p->nombre . $tag, 48) .
                    str_pad('$' . number_format($p->precio_compra, 0, ',', '.'), 8) .
                    str_pad('$' . number_format($p->precio_venta,  0, ',', '.'), 8) .
                    "{$pct}%"
                );
            }
        }
    }
}
