<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Renombra foto_url → foto_externa en productos.
 * foto_url ahora es un accessor calculado (Storage::url del campo foto).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->renameColumn('foto_url', 'foto_externa');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->renameColumn('foto_externa', 'foto_url');
        });
    }
};
