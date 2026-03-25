<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Unifica en_promo (bool) + es_combo (bool) en un solo campo tinyint:
 *   0 = sin promo
 *   1 = COMBO   (era es_combo = true)
 *   2 = OFERTA  (era en_promo = true, es_combo = false)
 *   3 = REGALO
 *
 * Elimina es_combo (redundante).
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Ampliar en_promo: bool → tinyint (MySQL trata BOOLEAN como TINYINT(1), solo cambia la semántica)
        DB::statement('ALTER TABLE productos MODIFY COLUMN en_promo TINYINT UNSIGNED NOT NULL DEFAULT 0');

        // 2. Migrar datos: COMBO tenía es_combo = 1 (independientemente de en_promo)
        DB::statement('UPDATE productos SET en_promo = 1 WHERE es_combo = 1');

        // 3. Los que tenían en_promo = 1 y es_combo = 0 → pasan a OFERTA (2)
        DB::statement('UPDATE productos SET en_promo = 2 WHERE en_promo = 1 AND es_combo = 0');

        // 4. Eliminar es_combo
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('es_combo');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->boolean('es_combo')->default(false)->after('fraccionable');
        });

        // Restaurar es_combo desde en_promo
        DB::statement('UPDATE productos SET es_combo = 1 WHERE en_promo = 1');
        DB::statement('UPDATE productos SET en_promo = 1 WHERE en_promo = 2');  // OFERTA → bool true
        DB::statement('UPDATE productos SET en_promo = 0 WHERE en_promo = 3');  // REGALO no tenía equivalente

        DB::statement('ALTER TABLE productos MODIFY COLUMN en_promo TINYINT(1) NOT NULL DEFAULT 0');
    }
};
