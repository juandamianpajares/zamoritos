<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
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

    public function balanceCategorias(): JsonResponse
    {
        $productos = Producto::with(['categoria.parent.parent'])
            ->where('activo', true)
            ->get();

        $grupos = [];

        foreach ($productos as $p) {
            $cat   = $p->categoria;
            $raiz  = $cat ? ($cat->parent?->parent ?? $cat->parent ?? $cat) : null;
            $key   = $raiz?->nombre ?? 'SIN CATEGORÍA';
            $sub   = $cat ? ($cat->parent && $cat->parent->parent ? $cat->parent->nombre : ($cat->parent ? $cat->nombre : null)) : null;

            if (!isset($grupos[$key])) {
                $grupos[$key] = [
                    'categoria'       => $key,
                    'subcategorias'   => [],
                    'total_productos' => 0,
                    'stock_total'     => 0,
                    'valor_inventario'=> 0,
                    'agotados'        => 0,
                ];
            }

            $grupos[$key]['total_productos']++;
            $grupos[$key]['stock_total']      += $p->stock;
            $grupos[$key]['valor_inventario'] += $p->stock * ($p->precio_compra ?? 0);
            if ($p->stock <= 0) $grupos[$key]['agotados']++;

            // sub-grupo
            $subKey = $sub ?? 'GENERAL';
            if (!isset($grupos[$key]['subcategorias'][$subKey])) {
                $grupos[$key]['subcategorias'][$subKey] = [
                    'nombre'          => $subKey,
                    'total_productos' => 0,
                    'stock_total'     => 0,
                    'valor_inventario'=> 0,
                    'agotados'        => 0,
                    'productos'       => [],
                ];
            }
            $grupos[$key]['subcategorias'][$subKey]['total_productos']++;
            $grupos[$key]['subcategorias'][$subKey]['stock_total']      += $p->stock;
            $grupos[$key]['subcategorias'][$subKey]['valor_inventario'] += $p->stock * ($p->precio_compra ?? 0);
            if ($p->stock <= 0) $grupos[$key]['subcategorias'][$subKey]['agotados']++;
            $grupos[$key]['subcategorias'][$subKey]['productos'][] = [
                'id'            => $p->id,
                'nombre'        => $p->nombre,
                'codigo_barras' => $p->codigo_barras,
                'stock'         => $p->stock,
                'unidad_medida' => $p->unidad_medida,
                'precio_compra' => $p->precio_compra,
                'precio_venta'  => $p->precio_venta,
            ];
        }

        // Convertir subcategorías a arrays indexados
        foreach ($grupos as &$g) {
            $g['subcategorias'] = array_values($g['subcategorias']);
        }

        return response()->json(array_values($grupos));
    }
}
