<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('compras', function (Blueprint $table) {
            // Modalidad de pago elegida al crear la compra
            $table->enum('tipo_pago', ['contado', 'diferido'])->default('contado')->after('nota');

            // 0 = contado, 30 / 45 / 60 = días de plazo para diferida
            $table->unsignedSmallInteger('dias_plazo')->default(0)->after('tipo_pago');

            // Fecha límite de pago (null para contado)
            $table->date('fecha_vencimiento')->nullable()->after('dias_plazo');

            // Estado calculado y actualizado cada vez que entra un pago
            $table->enum('estado_pago', ['pagado', 'pendiente', 'parcial'])->default('pendiente')->after('fecha_vencimiento');

            // Suma de todos los pagos registrados contra esta compra
            $table->decimal('monto_pagado', 12, 2)->default(0)->after('estado_pago');
        });
    }

    public function down(): void
    {
        Schema::table('compras', function (Blueprint $table) {
            $table->dropColumn(['tipo_pago', 'dias_plazo', 'fecha_vencimiento', 'estado_pago', 'monto_pagado']);
        });
    }
};
