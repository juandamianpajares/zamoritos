<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Producto::with('categoria')->where('activo', true);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombre', 'like', "%$s%")
                  ->orWhere('codigo_barras', 'like', "%$s%")
                  ->orWhere('marca', 'like', "%$s%");
            });
        }

        if ($request->filled('categoria_id')) {
            $query->where('categoria_id', $request->categoria_id);
        }

        if ($request->boolean('stock_bajo')) {
            $query->where('stock', '<=', 5);
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function show(Producto $producto): JsonResponse
    {
        return response()->json($producto->load('categoria'));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'        => 'required|string',
            'codigo_barras' => 'nullable|string|unique:productos,codigo_barras',
            'marca'         => 'nullable|string',
            'categoria_id'  => 'nullable|exists:categorias,id',
            'peso'          => 'nullable|numeric|min:0',
            'unidad_medida' => 'required|string',
            'precio_venta'  => 'required|numeric|min:0',
            'stock'         => 'nullable|numeric|min:0',
        ]);

        return response()->json(Producto::create($data), 201);
    }

    public function update(Request $request, Producto $producto): JsonResponse
    {
        $data = $request->validate([
            'nombre'        => 'required|string',
            'codigo_barras' => 'nullable|string|unique:productos,codigo_barras,' . $producto->id,
            'marca'         => 'nullable|string',
            'categoria_id'  => 'nullable|exists:categorias,id',
            'peso'          => 'nullable|numeric|min:0',
            'unidad_medida' => 'required|string',
            'precio_venta'  => 'required|numeric|min:0',
        ]);

        $producto->update($data);
        return response()->json($producto->load('categoria'));
    }

    public function destroy(Producto $producto): JsonResponse
    {
        $producto->update(['activo' => false]);
        return response()->json(null, 204);
    }
}
