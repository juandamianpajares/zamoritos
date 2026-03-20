<?php

namespace Database\Seeders;

use App\Models\Producto;
use Illuminate\Database\Seeder;

/**
 * Vincula los combos cruzados configurando promo_producto_id.
 * Debe ejecutarse DESPUÉS de ProductoSeeder.
 *
 * Combos (PROMOS.csv):
 *   C1  LAGER 22kg          + LAGER 10kg          = $2200  → $1100 c/u
 *   C2  PRIMOCAO Negra 22kg + PRIMOCAO Negra 7kg   = $2493  → $1247 c/u
 *   C3  VITTAMAX Classic 25 + VITTAMAX Classic 10  = $2870  → $1435 c/u
 *   C4  PRIMOCAO Naranja 22 + PRIMOCAO Naranja 10  = $3300  → $1650 c/u
 *   C5  REALCAN 25kg        + REALCAN 8kg          = $1990  →  $995 c/u
 *   O1  FORTACHON 25kg × 2  (mismo producto)       = $2013  → $1007 c/u  ← promo_producto_id = null
 */
class PromoSeeder extends Seeder
{
    public function run(): void
    {
        /**
         * Cada entrada: [ codigo_principal, codigo_partner ]
         * La bolsa grande apunta a la pequeña como partner.
         * El partner apunta de vuelta al principal (combo bidireccional).
         */
        $combos = [
            // C1 – LAGER
            ['7730918030051', '7730918030044'],
            // C2 – PRIMOCAO Mant. Negra
            ['7898510456119', '7908320401046'],
            // C3 – VITTAMAX Classic
            ['7898224823153', '7898224824167'],
            // C4 – PRIMOCAO Premium Naranja
            ['7898510458878', '7898510458854'],
            // C5 – REALCAN
            ['7730900660259', '7730900660648'],
            // O1 – FORTACHON 25kg × 2  → mismo producto, no necesita promo_producto_id
        ];

        foreach ($combos as [$cbPrincipal, $cbPartner]) {
            $principal = Producto::where('codigo_barras', $cbPrincipal)->first();
            $partner   = Producto::where('codigo_barras', $cbPartner)->first();

            if (! $principal || ! $partner) {
                $this->command->warn("Combo no encontrado: {$cbPrincipal} ↔ {$cbPartner}");
                continue;
            }

            // La bolsa grande apunta a la pequeña
            $principal->update(['promo_producto_id' => $partner->id]);
            // La bolsa pequeña apunta de vuelta a la grande (bidireccional en el POS)
            $partner->update(['promo_producto_id' => $principal->id]);
        }

        $this->command->info('PromoSeeder: combos vinculados correctamente.');
    }
}
