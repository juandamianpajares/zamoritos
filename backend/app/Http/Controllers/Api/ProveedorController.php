<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProveedorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Proveedor::where('activo', true);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombre', 'like', "%$s%")
                  ->orWhere('rut', 'like', "%$s%")
                  ->orWhere('email', 'like', "%$s%");
            });
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function show(Proveedor $proveedor): JsonResponse
    {
        return response()->json($proveedor->load('compras'));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => 'required|string',
            'rut'       => 'nullable|string',
            'telefono'  => 'nullable|string',
            'email'     => 'nullable|email',
            'direccion' => 'nullable|string',
            'contacto'  => 'nullable|string',
            'notas'     => 'nullable|string',
        ]);

        return response()->json(Proveedor::create($data), 201);
    }

    public function update(Request $request, Proveedor $proveedor): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => 'required|string',
            'rut'       => 'nullable|string',
            'telefono'  => 'nullable|string',
            'email'     => 'nullable|email',
            'direccion' => 'nullable|string',
            'contacto'  => 'nullable|string',
            'notas'     => 'nullable|string',
        ]);

        $proveedor->update($data);
        return response()->json($proveedor);
    }

    public function destroy(Proveedor $proveedor): JsonResponse
    {
        $proveedor->update(['activo' => false]);
        return response()->json(null, 204);
    }
}
