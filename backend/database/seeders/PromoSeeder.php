<?php

namespace Database\Seeders;

use App\Models\Producto;
use Illuminate\Database\Seeder;

/**
 * Aplica los campos de promo/combo a los productos del catálogo.
 *
 * Para los productos individuales que integran un combo:
 *   - promo_producto_id apunta al producto "partner" del par
 *     (sirve para el POS cuando se arma el combo desde productos sueltos)
 *
 * Para los productos combo (código C / O):
 *   - en_promo = true
 *   - precio_promo = precio_venta del combo
 *   - (ya tienen es_combo = true y combo_items desde ProductoSeeder)
 *
 * Datos de catálogo (marzo 2026):
 *   C1  LAGER 22+10           $2200
 *   C2  MANT NEGRA 22+7       $2493
 *   C3  VITTAMAX CLASSIC 25+10 $2870
 *   C4  PREMIUM NARANJA 22+10  $3300
 *   C5  REALCAN 25+8           $1990
 *   O1  FORTACHON 25×2         $2013
 */
class PromoSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Vincular pares de productos individuales (promo_producto_id) ──
        //    [código_grande, código_pequeño]
        $pares = [
            ['7730918030051', '7730918030044'],  // LAGER 22 ↔ LAGER 10
            ['7898510456119', '7908320401046'],  // MANT NEGRA 22+2 ↔ MANT NEGRA 7
            ['7898224823153', '7898224824167'],  // VITTAMAX 25 ↔ VITTAMAX 10
            ['7898510458878', '7898510458854'],  // PREMIUM NARANJA 22+2 ↔ PREMIUM NARANJA 10
            ['7730900660259', '7730900660648'],  // REALCAN 25 ↔ REALCAN 8
            // FORTACHON O1: mismo producto × 2, no necesita partner
        ];

        foreach ($pares as [$codA, $codB]) {
            $a = Producto::where('codigo_barras', $codA)->first();
            $b = Producto::where('codigo_barras', $codB)->first();

            if (!$a || !$b) {
                $this->command->warn("Par no encontrado: {$codA} ↔ {$codB}");
                continue;
            }

            $a->update(['promo_producto_id' => $b->id]);
            $b->update(['promo_producto_id' => $a->id]);
        }

        // ── 2. Marcar productos combo/oferta con en_promo + precio_promo ─────
        //    [código_combo, precio_promo]
        $combos = [
            ['7730918030051C', 2200],
            ['7898510456119C', 2493],
            ['7898224823153C', 2870],
            ['7898510458878C', 3300],
            ['7730900660259C', 1990],
            ['7730900660761O', 2013],
        ];

        foreach ($combos as [$codigo, $pp]) {
            $updated = Producto::where('codigo_barras', $codigo)
                ->update(['en_promo' => true, 'precio_promo' => $pp]);

            if (!$updated) {
                $this->command->warn("Combo no encontrado: {$codigo}");
            }
        }

        $this->command->info('PromoSeeder: pares vinculados y combos marcados.');
    }
}
