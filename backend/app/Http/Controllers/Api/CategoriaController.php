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

    public function tree(): JsonResponse
    {
        $all = Categoria::orderBy('nombre')->get()->keyBy('id');

        // Construir árbol en memoria (sin N+1 queries)
        $roots = [];
        foreach ($all as $cat) {
            $cat->children = [];
        }
        foreach ($all as $cat) {
            if ($cat->parent_id && isset($all[$cat->parent_id])) {
                $all[$cat->parent_id]->children[] = $cat;
            } else {
                $roots[] = $cat;
            }
        }

        return response()->json(array_values($roots));
    }

    public function store(Request $request): JsonResponse
    {
        $parentId = $request->input('parent_id');
        $data = $request->validate([
            'nombre'      => 'required|string',
            'descripcion' => 'nullable|string|max:300',
            'tags'        => 'nullable|array',
            'tags.*'      => 'string',
            'parent_id'   => 'nullable|exists:categorias,id',
        ]);
        // Unique compuesto (nombre, parent_id)
        $existe = Categoria::where('nombre', $data['nombre'])
            ->where('parent_id', $parentId)
            ->exists();
        if ($existe) {
            return response()->json(['message' => 'Ya existe una categoría con ese nombre en este nivel.'], 422);
        }
        return response()->json(Categoria::create($data), 201);
    }

    public function update(Request $request, Categoria $categoria): JsonResponse
    {
        $parentId = $request->input('parent_id', $categoria->parent_id);
        $data = $request->validate([
            'nombre'      => 'required|string',
            'descripcion' => 'nullable|string|max:300',
            'tags'        => 'nullable|array',
            'tags.*'      => 'string',
            'parent_id'   => 'nullable|exists:categorias,id',
        ]);
        // Unique compuesto (nombre, parent_id) excluyendo el actual
        $existe = Categoria::where('nombre', $data['nombre'])
            ->where('parent_id', $parentId)
            ->where('id', '!=', $categoria->id)
            ->exists();
        if ($existe) {
            return response()->json(['message' => 'Ya existe una categoría con ese nombre en este nivel.'], 422);
        }
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
