<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Compra;
use App\Models\PagoProveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Gestión de pagos a proveedores.
 *
 * GET  /pagos-proveedores              Lista (filtros: proveedor_id, tipo, compra_id, pendientes)
 * POST /pagos-proveedores              Registrar pago (pre-compra, cuota o pago manual)
 * POST /pagos-proveedores/{id}/asociar Asociar un pre_compra a una compra recién llegada
 * GET  /cuentas-pagar                  Resumen de compras con saldo pendiente
 */
class PagoProveedorController extends Controller
{
    // ── Listado de pagos ──────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = PagoProveedor::with('proveedor', 'compra')
            ->orderByDesc('fecha');

        if ($request->filled('proveedor_id')) {
            $query->where('proveedor_id', $request->proveedor_id);
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->filled('compra_id')) {
            $query->where('compra_id', $request->compra_id);
        }
        // solo pre-compras sin compra asociada todavía
        if ($request->boolean('sin_asociar')) {
            $query->where('tipo', 'pre_compra')->whereNull('compra_id');
        }

        return response()->json($query->get());
    }

    // ── Registrar un pago ─────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'proveedor_id' => 'required|exists:proveedores,id',
            'compra_id'    => 'nullable|exists:compras,id',
            'tipo'         => 'required|in:pre_compra,contado,cuota,manual',
            'monto'        => 'required|numeric|min:0.01',
            'fecha'        => 'required|date',
            'medio_pago'   => 'required|in:efectivo,transferencia,cheque,otro',
            'referencia'   => 'nullable|string|max:200',
            'nota'         => 'nullable|string',
            'usuario'      => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data) {
            $pago = PagoProveedor::create($data);

            if ($data['compra_id'] ?? null) {
                // Pago contra factura → recalcular estado de la compra
                $this->recalcularCompra($data['compra_id']);
            } elseif ($data['tipo'] === 'manual') {
                // Pago manual → descontar del saldo_manual del proveedor (mínimo 0)
                $proveedor = \App\Models\Proveedor::find($data['proveedor_id']);
                $nuevoSaldo = max(0, $proveedor->saldo_manual - $data['monto']);
                $proveedor->update(['saldo_manual' => $nuevoSaldo]);
            }

            return response()->json($pago->load('proveedor', 'compra'), 201);
        });
    }

    // ── Asociar un pre_compra a una compra ────────────────────────────────────

    public function asociar(Request $request, PagoProveedor $pagoProveedor): JsonResponse
    {
        if ($pagoProveedor->tipo !== 'pre_compra') {
            return response()->json(['message' => 'Solo se pueden asociar pagos de tipo pre_compra.'], 422);
        }

        $data = $request->validate([
            'compra_id' => 'required|exists:compras,id',
        ]);

        return DB::transaction(function () use ($pagoProveedor, $data) {
            $pagoProveedor->update(['compra_id' => $data['compra_id']]);
            $this->recalcularCompra($data['compra_id']);

            return response()->json($pagoProveedor->fresh()->load('proveedor', 'compra'));
        });
    }

    // ── Resumen cuentas por pagar ─────────────────────────────────────────────

    public function cuentasPagar(Request $request): JsonResponse
    {
        $query = Compra::with('proveedor')
            ->whereIn('estado_pago', ['pendiente', 'parcial'])
            ->orderBy('fecha_vencimiento');

        if ($request->filled('proveedor_id')) {
            $query->where('proveedor_id', $request->proveedor_id);
        }

        // Vencidas / próximas a vencer
        if ($request->filled('hasta')) {
            $query->where('fecha_vencimiento', '<=', $request->hasta);
        }

        $compras = $query->get()->map(fn($c) => array_merge($c->toArray(), [
            'saldo' => round($c->total - $c->monto_pagado, 2),
        ]));

        $totalPendiente = $compras->sum('saldo');

        return response()->json([
            'total_pendiente' => $totalPendiente,
            'compras'         => $compras,
        ]);
    }

    // ── Helper: recalcula monto_pagado y estado_pago de una compra ────────────

    private function recalcularCompra(int $compraId): void
    {
        $compra      = Compra::findOrFail($compraId);
        $montoPagado = PagoProveedor::where('compra_id', $compraId)->sum('monto');

        $estado = match (true) {
            $montoPagado <= 0                => 'pendiente',
            $montoPagado >= $compra->total   => 'pagado',
            default                          => 'parcial',
        };

        $compra->update([
            'monto_pagado' => $montoPagado,
            'estado_pago'  => $estado,
        ]);
    }
}
