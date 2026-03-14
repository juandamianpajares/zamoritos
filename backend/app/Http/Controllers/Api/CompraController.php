<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Compra;
use App\Models\DetalleCompra;
use App\Models\Lote;
use App\Models\MovimientoStock;
use App\Models\Producto;
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

        return response()->json($query->get());
    }

    public function show(Compra $compra): JsonResponse
    {
        return response()->json(
            $compra->load('proveedor', 'detalles.producto')
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'proveedor_id'                      => 'nullable|exists:proveedores,id',
            'fecha'                             => 'required|date',
            'factura'                           => 'nullable|string',
            'usuario'                           => 'nullable|string',
            'detalles'                          => 'required|array|min:1',
            'detalles.*.producto_id'            => 'required|exists:productos,id',
            'detalles.*.cantidad'               => 'required|numeric|min:0.001',
            'detalles.*.precio_compra'          => 'required|numeric|min:0',
            'detalles.*.fecha_vencimiento'      => 'nullable|date',
        ]);

        return DB::transaction(function () use ($data) {
            $total = collect($data['detalles'])
                ->sum(fn($d) => $d['cantidad'] * $d['precio_compra']);

            $compra = Compra::create([
                'proveedor_id' => $data['proveedor_id'] ?? null,
                'fecha'        => $data['fecha'],
                'factura'      => $data['factura'] ?? null,
                'usuario'      => $data['usuario'] ?? null,
                'total'        => $total,
            ]);

            foreach ($data['detalles'] as $d) {
                $subtotal = $d['cantidad'] * $d['precio_compra'];

                DetalleCompra::create([
                    'compra_id'     => $compra->id,
                    'producto_id'   => $d['producto_id'],
                    'cantidad'      => $d['cantidad'],
                    'precio_compra' => $d['precio_compra'],
                    'subtotal'      => $subtotal,
                ]);

                $producto = Producto::findOrFail($d['producto_id']);
                $producto->increment('stock', $d['cantidad']);

                MovimientoStock::create([
                    'producto_id' => $d['producto_id'],
                    'tipo'        => 'ingreso',
                    'cantidad'    => $d['cantidad'],
                    'referencia'  => 'compra #' . $compra->id,
                    'usuario'     => $data['usuario'] ?? null,
                    'observacion' => 'Factura: ' . ($data['factura'] ?? '-'),
                ]);

                Lote::create([
                    'producto_id'       => $d['producto_id'],
                    'compra_id'         => $compra->id,
                    'cantidad'          => $d['cantidad'],
                    'cantidad_restante' => $d['cantidad'],
                    'fecha_vencimiento' => $d['fecha_vencimiento'] ?? null,
                ]);
            }

            return response()->json($compra->load('proveedor', 'detalles.producto'), 201);
        });
    }
}
