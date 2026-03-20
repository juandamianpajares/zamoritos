<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->json('medios_pago')->nullable()->after('medio_pago');
        });

        Schema::table('proveedores', function (Blueprint $table) {
            $table->text('notas')->nullable()->after('contacto');
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropColumn('medios_pago');
        });
        Schema::table('proveedores', function (Blueprint $table) {
            $table->dropColumn('notas');
        });
    }
};
