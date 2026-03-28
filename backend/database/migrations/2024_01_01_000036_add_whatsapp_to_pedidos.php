<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            // null = no enviado, true = enviado ok, false = falló el envío
            $table->boolean('whatsapp_enviado')->nullable()->default(null)->after('notas');
            $table->timestamp('whatsapp_enviado_at')->nullable()->after('whatsapp_enviado');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_enviado', 'whatsapp_enviado_at']);
        });
    }
};
