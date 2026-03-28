<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Agregar costo_envio a ventas (para ventas con delivery)
        Schema::table('ventas', function (Blueprint $table) {
            $table->decimal('costo_envio', 10, 2)->default(0)->after('total');
        });

        // Vincular pedido con la venta que lo originó (nullable: pedidos manuales no tienen venta)
        Schema::table('pedidos', function (Blueprint $table) {
            $table->unsignedBigInteger('venta_id')->nullable()->after('id');
            $table->foreign('venta_id')->references('id')->on('ventas')->nullOnDelete();
        });

        // Agregar whatsapp_enviado si aún no existe (por si la migración 000036 no se corrió)
        if (!Schema::hasColumn('pedidos', 'whatsapp_enviado')) {
            Schema::table('pedidos', function (Blueprint $table) {
                $table->boolean('whatsapp_enviado')->nullable()->default(null)->after('notas');
                $table->timestamp('whatsapp_enviado_at')->nullable()->after('whatsapp_enviado');
            });
        }
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropColumn('costo_envio');
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropForeign(['venta_id']);
            $table->dropColumn('venta_id');
        });
    }
};
