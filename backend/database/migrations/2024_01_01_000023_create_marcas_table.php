<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('marcas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->unique();
            $table->timestamps();
        });

        Schema::table('productos', function (Blueprint $table) {
            $table->unsignedBigInteger('marca_id')->nullable()->after('marca');
            $table->foreign('marca_id')->references('id')->on('marcas')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropForeign(['marca_id']);
            $table->dropColumn('marca_id');
        });
        Schema::dropIfExists('marcas');
    }
};
