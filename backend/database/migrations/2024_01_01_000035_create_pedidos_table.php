<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 20)->unique();           // PED-0001
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->enum('estado', ['pendiente','confirmado','enviado','entregado','cancelado'])
                  ->default('pendiente');
            $table->decimal('costo_envio', 10, 2)->default(0);
            $table->string('medio_pago', 50)->nullable();
            $table->text('notas')->nullable();
            $table->date('fecha');
            $table->timestamps();
        });

        Schema::create('detalle_pedidos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->constrained('pedidos')->cascadeOnDelete();
            $table->foreignId('producto_id')->nullable()->constrained('productos')->nullOnDelete();
            $table->string('nombre_producto', 200);           // snapshot del nombre
            $table->decimal('cantidad', 10, 3)->default(1);
            $table->decimal('precio_unitario', 10, 2)->default(0);
            $table->decimal('subtotal', 12, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_pedidos');
        Schema::dropIfExists('pedidos');
    }
};
