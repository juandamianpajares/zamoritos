<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Compra;
use App\Models\DetalleCompra;
use App\Models\Lote;
use App\Models\MovimientoStock;
use App\Models\PagoProveedor;
use App\Models\Producto;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompraController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Compra::with('proveedor')->orderByDesc('fecha');

        if ($request->filled('proveedor_id')) {
            $query->where('proveedor_id', $request->proveedor_id);
        }

        if ($request->filled('estado_pago')) {
            $query->where('estado_pago', $request->estado_pago);
        }

        return response()->json($query->get());
    }

    public function show(Compra $compra): JsonResponse
    {
        return response()->json(
            $compra->load('proveedor', 'detalles.producto', 'pagos')
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'proveedor_id'                 => 'required|exists:proveedores,id',
            'fecha'                        => 'required|date',
            'factura'                      => 'nullable|string',
            'usuario'                      => 'nullable|string',
            'nota'                         => 'nullable|string',
            // Pago
            'tipo_pago'                    => 'required|in:contado,diferido',
            'dias_plazo'                   => 'required_if:tipo_pago,diferido|in:0,30,45,60|integer',
            'medio_pago'                   => 'nullable|in:efectivo,transferencia,cheque,otro',
            'referencia_pago'              => 'nullable|string|max:200',
            // Ítems
            'detalles'                     => 'required|array|min:1',
            'detalles.*.producto_id'       => 'required|exists:productos,id',
            'detalles.*.cantidad'          => 'required|numeric|min:0.001',
            'detalles.*.precio_compra'     => 'required|numeric|min:0',
            'detalles.*.fecha_vencimiento' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($data) {
            $total     = collect($data['detalles'])->sum(fn($d) => $d['cantidad'] * $d['precio_compra']);
            $tipoPago  = $data['tipo_pago'];
            $diasPlazo = $tipoPago === 'diferido' ? (int) ($data['dias_plazo'] ?? 30) : 0;

            $fechaVencimiento = $tipoPago === 'diferido'
                ? Carbon::parse($data['fecha'])->addDays($diasPlazo)->toDateString()
                : null;

            // Contado → ya está pagado; diferido → pendiente
            $estadoPago  = $tipoPago === 'contado' ? 'pagado' : 'pendiente';
            $montoPagado = $tipoPago === 'contado' ? $total : 0;

            $compra = Compra::create([
                'proveedor_id'      => $data['proveedor_id'] ?? null,
                'fecha'             => $data['fecha'],
                'factura'           => $data['factura'] ?? null,
                'usuario'           => $data['usuario'] ?? null,
                'nota'              => $data['nota'] ?? null,
                'total'             => $total,
                'tipo_pago'         => $tipoPago,
                'dias_plazo'        => $diasPlazo,
                'fecha_vencimiento' => $fechaVencimiento,
                'estado_pago'       => $estadoPago,
                'monto_pagado'      => $montoPagado,
            ]);

            // Pago automático para compras contado
            if ($tipoPago === 'contado' && $data['proveedor_id'] ?? null) {
                PagoProveedor::create([
                    'proveedor_id' => $data['proveedor_id'],
                    'compra_id'    => $compra->id,
                    'tipo'         => 'contado',
                    'monto'        => $total,
                    'fecha'        => $data['fecha'],
                    'medio_pago'   => $data['medio_pago'] ?? 'efectivo',
                    'referencia'   => $data['referencia_pago'] ?? null,
                    'usuario'      => $data['usuario'] ?? null,
                ]);
            }

            foreach ($data['detalles'] as $d) {
                $subtotal = $d['cantidad'] * $d['precio_compra'];

                DetalleCompra::create([
                    'compra_id'     => $compra->id,
                    'producto_id'   => $d['producto_id'],
                    'cantidad'      => $d['cantidad'],
                    'precio_compra' => $d['precio_compra'],
                    'subtotal'      => $subtotal,
                ]);

                $producto = Producto::with('comboItems')->findOrFail($d['producto_id']);
                $producto->update(['precio_compra' => $d['precio_compra']]);

                $factura   = $data['factura'] ?? null;
                $usuario   = $data['usuario'] ?? null;
                $fechaVenc = $d['fecha_vencimiento'] ?? null;

                $esPromo = $producto->en_promo > 0 && $producto->comboItems->isNotEmpty();

                if ($esPromo) {
                    // Promo/combo: el stock físico vive en los componentes
                    foreach ($producto->comboItems as $item) {
                        $componente = Producto::findOrFail($item->componente_producto_id);
                        $qtdComp    = $item->cantidad * $d['cantidad'];

                        $componente->increment('stock', $qtdComp);

                        MovimientoStock::create([
                            'producto_id' => $componente->id,
                            'tipo'        => 'ingreso',
                            'cantidad'    => $qtdComp,
                            'referencia'  => 'compra #' . $compra->id . ' (promo «' . $producto->nombre . '»)',
                            'usuario'     => $usuario,
                            'observacion' => 'Factura: ' . ($factura ?? '-'),
                        ]);

                        Lote::create([
                            'producto_id'       => $componente->id,
                            'compra_id'         => $compra->id,
                            'cantidad'          => $qtdComp,
                            'cantidad_restante' => $qtdComp,
                            'fecha_vencimiento' => $fechaVenc,
                        ]);
                    }
                } else {
                    // Producto individual: stock directo
                    $producto->increment('stock', $d['cantidad']);

                    MovimientoStock::create([
                        'producto_id' => $d['producto_id'],
                        'tipo'        => 'ingreso',
                        'cantidad'    => $d['cantidad'],
                        'referencia'  => 'compra #' . $compra->id,
                        'usuario'     => $usuario,
                        'observacion' => 'Factura: ' . ($factura ?? '-'),
                    ]);

                    Lote::create([
                        'producto_id'       => $d['producto_id'],
                        'compra_id'         => $compra->id,
                        'cantidad'          => $d['cantidad'],
                        'cantidad_restante' => $d['cantidad'],
                        'fecha_vencimiento' => $fechaVenc,
                    ]);
                }
            }

            return response()->json($compra->load('proveedor', 'detalles.producto', 'pagos'), 201);
        });
    }
}
