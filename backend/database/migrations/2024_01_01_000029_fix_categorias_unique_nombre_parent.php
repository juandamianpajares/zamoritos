<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La constraint unique('nombre') impide tener categorías con el mismo
 * nombre bajo distintos padres (ej: BEBE bajo PERRO y BEBE bajo GATO).
 * Se reemplaza por unique compuesto (nombre, parent_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropUnique(['nombre']);
            $table->unique(['nombre', 'parent_id']);
        });
    }

    public function down(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropUnique(['nombre', 'parent_id']);
            $table->unique('nombre');
        });
    }
};
