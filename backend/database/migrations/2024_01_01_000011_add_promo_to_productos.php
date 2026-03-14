<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->boolean('en_promo')->default(false)->after('fraccionado_de');
            $table->decimal('precio_promo', 10, 2)->nullable()->after('en_promo');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn(['en_promo', 'precio_promo']);
        });
    }
};
