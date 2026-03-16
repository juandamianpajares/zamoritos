<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->unsignedBigInteger('promo_producto_id')->nullable()->after('precio_promo');
            $table->boolean('fraccionable')->default(false)->after('promo_producto_id');
            $table->foreign('promo_producto_id')
                  ->references('id')
                  ->on('productos')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropForeign(['promo_producto_id']);
            $table->dropColumn(['promo_producto_id', 'fraccionable']);
        });
    }
};
