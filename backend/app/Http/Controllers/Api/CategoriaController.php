<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    /** Lista plana para selects (con id de padre) */
    public function index(): JsonResponse
    {
        return response()->json(
            Categoria::orderBy('parent_id')->orderBy('nombre')->get()
        );
    }

    /** Árbol jerárquico para el frontend de categorías */
    public function tree(): JsonResponse
    {
        $tree = Categoria::with('children')
            ->whereNull('parent_id')
            ->orderBy('nombre')
            ->get();
        return response()->json($tree);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => 'required|string',
            'parent_id' => 'nullable|exists:categorias,id',
        ]);
        return response()->json(Categoria::create($data), 201);
    }

    public function update(Request $request, Categoria $categoria): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => 'required|string',
            'parent_id' => 'nullable|exists:categorias,id',
        ]);
        $categoria->update($data);
        return response()->json($categoria);
    }

    public function destroy(Categoria $categoria): JsonResponse
    {
        if ($categoria->productos()->exists()) {
            return response()->json(['message' => 'No se puede eliminar: tiene productos asociados.'], 422);
        }
        if ($categoria->children()->exists()) {
            return response()->json(['message' => 'No se puede eliminar: tiene subcategorías.'], 422);
        }
        $categoria->delete();
        return response()->json(null, 204);
    }
}
