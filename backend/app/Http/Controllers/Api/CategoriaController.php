<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Categoria::orderBy('nombre')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'      => 'required|string|unique:categorias,nombre',
            'descripcion' => 'nullable|string|max:300',
            'tags'        => 'nullable|array',
            'tags.*'      => 'string',
        ]);
        return response()->json(Categoria::create($data), 201);
    }

    public function update(Request $request, Categoria $categoria): JsonResponse
    {
        $data = $request->validate([
            'nombre'      => 'required|string|unique:categorias,nombre,' . $categoria->id,
            'descripcion' => 'nullable|string|max:300',
            'tags'        => 'nullable|array',
            'tags.*'      => 'string',
        ]);
        $categoria->update($data);
        return response()->json($categoria);
    }

    public function destroy(Categoria $categoria): JsonResponse
    {
        if ($categoria->productos()->exists()) {
            return response()->json(['message' => 'No se puede eliminar: tiene productos asociados.'], 422);
        }
        $categoria->delete();
        return response()->json(null, 204);
    }
}
