<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Fix promo codes: remove dash before suffix ──────────────────────
        foreach (['-C' => 'C', '-O' => 'O', '-R' => 'R'] as $old => $new) {
            $productos = DB::table('productos')
                ->where('codigo_barras', 'like', '%' . $old)
                ->pluck('codigo_barras');

            if ($productos->isEmpty()) continue;

            // Rename image files
            foreach ($productos as $code) {
                $oldSlug = Str::slug($code, '_');
                $newCode = substr($code, 0, -strlen($old)) . $new;
                $newSlug = Str::slug($newCode, '_');

                foreach (['productos/' . $oldSlug . '.webp', 'productos/thumbs/' . $oldSlug . '.webp'] as $path) {
                    if (Storage::disk('public')->exists($path)) {
                        Storage::disk('public')->move($path, str_replace($oldSlug, $newSlug, $path));
                    }
                }
            }

            // Update DB codes
            DB::statement("
                UPDATE productos
                SET codigo_barras = CONCAT(LEFT(codigo_barras, LENGTH(codigo_barras) - " . strlen($old) . "), '" . $new . "')
                WHERE codigo_barras LIKE '%" . $old . "'
            ");
        }

        // ── 2. Expand pedidos.estado ENUM to include new states ───────────────
        DB::statement("
            ALTER TABLE pedidos
            MODIFY COLUMN estado ENUM(
                'pendiente','preparando','confirmado','sin_facturar',
                'enviado','entregado','cancelado'
            ) NOT NULL DEFAULT 'pendiente'
        ");

        // ── 3. Add cancellation tracking to pedidos ────────────────────────────
        Schema::table('pedidos', function (Blueprint $table) {
            if (!Schema::hasColumn('pedidos', 'tipo_cancelacion')) {
                $table->enum('tipo_cancelacion', ['anulacion','devolucion','cancelado_entrega'])
                      ->nullable()->after('estado');
            }
            if (!Schema::hasColumn('pedidos', 'saldo_faltante')) {
                $table->decimal('saldo_faltante', 10, 2)->default(0)->after('tipo_cancelacion');
            }
        });

        // ── 4. Make telefono unique in clientes (ignoring NULLs) ──────────────
        // Only add the unique index if there are no current duplicates
        $hasDuplicates = DB::table('clientes')
            ->whereNotNull('telefono')
            ->where('telefono', '!=', '')
            ->select('telefono')
            ->groupBy('telefono')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if (!$hasDuplicates) {
            try {
                Schema::table('clientes', function (Blueprint $table) {
                    $table->unique('telefono', 'clientes_telefono_unique');
                });
            } catch (\Throwable $e) {
                // Index may already exist
            }
        }
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE pedidos
            MODIFY COLUMN estado ENUM(
                'pendiente','confirmado','enviado','entregado','cancelado'
            ) NOT NULL DEFAULT 'pendiente'
        ");

        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['tipo_cancelacion', 'saldo_faltante']);
        });
    }
};
