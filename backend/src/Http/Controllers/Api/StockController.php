<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MovimientoStock;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MovimientoStock::with('producto')->orderByDesc('fecha');

        if ($request->filled('producto_id')) {
            $query->where('producto_id', $request->producto_id);
        }

        return response()->json($query->limit(200)->get());
    }

    public function ajuste(Request $request): JsonResponse
    {
        $data = $request->validate([
            'producto_id' => 'required|exists:productos,id',
            'cantidad'    => 'required|numeric|not_in:0',
            'observacion' => 'nullable|string',
            'usuario'     => 'nullable|string',
        ]);

        $producto = Producto::findOrFail($data['producto_id']);
        $nuevoStock = $producto->stock + $data['cantidad'];

        if ($nuevoStock < 0) {
            return response()->json([
                'message' => 'El ajuste dejaría el stock en negativo. Stock actual: ' . $producto->stock,
            ], 422);
        }

        $producto->update(['stock' => $nuevoStock]);

        $movimiento = MovimientoStock::create([
            'producto_id' => $data['producto_id'],
            'tipo'        => 'ajuste',
            'cantidad'    => $data['cantidad'],
            'usuario'     => $data['usuario'] ?? null,
            'observacion' => $data['observacion'] ?? null,
        ]);

        return response()->json($movimiento->load('producto'), 201);
    }

    public function bajo(): JsonResponse
    {
        $productos = Producto::with('categoria')
            ->where('activo', true)
            ->where('stock', '<=', 5)
            ->orderBy('stock')
            ->get();

        return response()->json($productos);
    }
}
