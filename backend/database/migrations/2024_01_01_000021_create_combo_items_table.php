<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('combo_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('combo_producto_id')->constrained('productos')->cascadeOnDelete();
            $table->foreignId('componente_producto_id')->constrained('productos')->cascadeOnDelete();
            $table->decimal('cantidad', 10, 3)->default(1);
            $table->timestamps();

            $table->unique(['combo_producto_id', 'componente_producto_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combo_items');
    }
};
