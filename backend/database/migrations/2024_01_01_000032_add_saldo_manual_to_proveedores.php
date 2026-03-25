<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega saldo_manual a proveedores.
 *
 * Representa deuda con el proveedor que no proviene de una factura de compra
 * registrada en el sistema (ej: deuda preexistente, ajuste manual).
 * Se descuenta automáticamente al registrar pagos de tipo 'manual'.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proveedores', function (Blueprint $table) {
            $table->decimal('saldo_manual', 12, 2)->default(0)->after('notas')
                  ->comment('Deuda con el proveedor fuera del sistema de compras (editable manualmente)');
        });

        // Extiende el enum de tipo en pagos_proveedores para incluir pagos manuales
        // MySQL no permite ALTER ENUM inline; usamos MODIFY COLUMN
        DB::statement("ALTER TABLE pagos_proveedores MODIFY COLUMN tipo ENUM('pre_compra','contado','cuota','manual') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE pagos_proveedores MODIFY COLUMN tipo ENUM('pre_compra','contado','cuota') NOT NULL");

        Schema::table('proveedores', function (Blueprint $table) {
            $table->dropColumn('saldo_manual');
        });
    }
};
