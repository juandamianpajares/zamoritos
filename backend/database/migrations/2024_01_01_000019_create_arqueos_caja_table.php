<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('arqueos_caja', function (Blueprint $table) {
            $table->id();
            $table->date('fecha')->unique();
            $table->json('denominaciones');           // { "2000": 3, "1000": 5, ... }
            $table->decimal('fondo_cambio', 12, 2)->default(0);
            $table->decimal('total_contado', 12, 2)->default(0);
            $table->decimal('total_esperado', 12, 2)->default(0);
            $table->decimal('diferencia', 12, 2)->default(0);
            $table->text('observacion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('arqueos_caja');
    }
};
