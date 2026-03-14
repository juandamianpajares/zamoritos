<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos');
            $table->foreignId('compra_id')->nullable()->constrained('compras')->nullOnDelete();
            $table->dateTime('fecha_ingreso')->useCurrent();
            $table->date('fecha_vencimiento')->nullable();
            $table->decimal('cantidad', 10, 3);
            $table->decimal('cantidad_restante', 10, 3);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lotes');
    }
};
