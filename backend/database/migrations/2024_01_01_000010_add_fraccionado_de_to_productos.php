<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->unsignedBigInteger('fraccionado_de')->nullable()->after('activo');
            $table->foreign('fraccionado_de')->references('id')->on('productos')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropForeign(['fraccionado_de']);
            $table->dropColumn('fraccionado_de');
        });
    }
};
