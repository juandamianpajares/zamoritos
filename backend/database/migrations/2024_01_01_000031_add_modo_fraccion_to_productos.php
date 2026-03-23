<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            // 'kg' = bolsas/alimentos fraccionados por peso
            // 'unidad' = blisters/cajas fraccionados por unidad (pastillas, comprimidos, etc.)
            $table->enum('modo_fraccion', ['kg', 'unidad'])->default('kg')->after('fraccionable');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('modo_fraccion');
        });
    }
};
