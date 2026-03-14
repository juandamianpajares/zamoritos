<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('movimientos_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos');
            $table->enum('tipo', ['ingreso', 'venta', 'venta_suelta', 'ajuste', 'vencimiento']);
            $table->decimal('cantidad', 10, 3)->comment('Positivo=entrada, Negativo=salida');
            $table->dateTime('fecha')->useCurrent();
            $table->string('referencia')->nullable()->comment('ID de compra, venta, etc.');
            $table->string('usuario')->nullable();
            $table->string('observacion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_stock');
    }
};
