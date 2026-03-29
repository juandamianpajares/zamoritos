<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Collect affected codes BEFORE updating (to rename images)
        $fraccionados = DB::table('productos')
            ->where('codigo_barras', 'like', '%-F')
            ->pluck('codigo_barras');

        // 2. Fix fraccionado codes: remove dash before F suffix
        //    e.g. "ABC123-F" → "ABC123F"
        DB::statement("
            UPDATE productos
            SET codigo_barras = CONCAT(LEFT(codigo_barras, LENGTH(codigo_barras) - 2), 'F')
            WHERE codigo_barras LIKE '%-F'
        ");

        // 3. Mark existing fraccionados as non-fraccionable
        DB::statement("
            UPDATE productos
            SET fraccionable = 0
            WHERE fraccionado_de IS NOT NULL
        ");

        // 4. Rename image files: abc123_f.webp → abc123f.webp
        foreach ($fraccionados as $oldCode) {
            $oldSlug = Str::slug($oldCode, '_');                        // e.g. abc123_f
            $newCode = substr($oldCode, 0, -2) . 'F';                   // strip -F, add F
            $newSlug = Str::slug($newCode, '_');                        // e.g. abc123f

            foreach (['productos/' . $oldSlug . '.webp', 'productos/thumbs/' . $oldSlug . '.webp'] as $oldPath) {
                if (Storage::disk('public')->exists($oldPath)) {
                    $newPath = str_replace($oldSlug, $newSlug, $oldPath);
                    Storage::disk('public')->move($oldPath, $newPath);
                }
            }
        }

        // 5. Fix numero_factura format:
        //    Convert plain numeric invoices to A-prefixed (A + 6 digits)
        DB::statement("
            UPDATE ventas
            SET numero_factura = CONCAT('A', LPAD(numero_factura, 6, '0'))
            WHERE numero_factura REGEXP '^[0-9]+$'
              AND numero_factura IS NOT NULL
              AND numero_factura != ''
        ");
    }

    public function down(): void
    {
        // Reverse fraccionado code fix
        DB::statement("
            UPDATE productos
            SET codigo_barras = CONCAT(LEFT(codigo_barras, LENGTH(codigo_barras) - 1), '-F')
            WHERE codigo_barras LIKE '%[^-]F'
              AND fraccionado_de IS NOT NULL
        ");
    }
};
