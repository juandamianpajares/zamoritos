<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ledger de pagos a proveedores.
 *
 * Modalidades:
 *   pre_compra  → pago antes de recibir mercadería (compra_id null hasta que llegue)
 *   contado     → pago al recibir (creado automáticamente por CompraController)
 *   cuota       → uno o varios pagos parciales de una compra diferida
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos_proveedores', function (Blueprint $table) {
            $table->id();

            $table->foreignId('proveedor_id')
                  ->constrained('proveedores')
                  ->cascadeOnDelete();

            // Null en pre_compra hasta que se asocie la compra correspondiente
            $table->foreignId('compra_id')
                  ->nullable()
                  ->constrained('compras')
                  ->nullOnDelete();

            $table->enum('tipo', ['pre_compra', 'contado', 'cuota']);

            $table->decimal('monto', 12, 2);

            $table->date('fecha');

            $table->enum('medio_pago', ['efectivo', 'transferencia', 'cheque', 'otro'])
                  ->default('efectivo');

            // Nro. de cheque, referencia de transferencia, etc.
            $table->string('referencia')->nullable();

            $table->text('nota')->nullable();

            $table->string('usuario')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos_proveedores');
    }
};
