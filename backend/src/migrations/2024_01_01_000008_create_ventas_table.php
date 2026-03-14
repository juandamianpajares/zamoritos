<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->dateTime('fecha');
            $table->enum('tipo_pago', ['contado', 'credito'])->default('contado');
            $table->string('medio_pago')->nullable();          // efectivo, tarjeta, oca, transferencia, otro
            $table->string('receptor_nombre')->nullable();     // Kitfe v2: cliente
            $table->string('receptor_rut')->nullable();        // Kitfe v2: RUT cliente
            $table->char('moneda', 3)->default('UYU');         // Kitfe v2: moneda
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('descuento', 12, 2)->default(0);   // Kitfe v2: descuentos globales
            $table->decimal('total', 12, 2)->default(0);
            $table->enum('estado', ['confirmada', 'anulada'])->default('confirmada');
            $table->string('tipo_comprobante')->nullable();    // Kitfe v2: e-ticket, e-factura
            $table->string('kitfe_id')->nullable();            // Kitfe v2: ID de sincronización
            $table->string('usuario')->nullable();
            $table->text('observacion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ventas');
    }
};
