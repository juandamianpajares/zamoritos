<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_barras')->nullable()->unique();
            $table->string('nombre');
            $table->string('marca')->nullable();
            $table->foreignId('categoria_id')->nullable()->constrained('categorias')->nullOnDelete();
            $table->decimal('peso', 10, 3)->nullable()->comment('Peso total del producto (ej: 22 para bolsa 22kg)');
            $table->string('unidad_medida')->default('unidad')->comment('kg, unidad, litro, gramo');
            $table->decimal('precio_venta', 10, 2);
            $table->decimal('stock', 10, 3)->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
