<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClienteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Cliente::orderBy('nombre');

        if ($request->filled('buscar')) {
            $b = '%' . $request->buscar . '%';
            $q->where(function ($qr) use ($b) {
                $qr->where('nombre',   'like', $b)
                   ->orWhere('telefono', 'like', $b)
                   ->orWhere('codigo',   'like', $b);
            });
        }

        return response()->json($q->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => 'required|string|max:200',
            'telefono'  => 'nullable|string|max:50',
            'direccion' => 'nullable|string|max:300',
            'notas'     => 'nullable|string|max:1000',
        ]);

        $data['codigo'] = Cliente::proximoCodigo();

        $cliente = Cliente::create($data);
        return response()->json($cliente, 201);
    }

    public function update(Request $request, Cliente $cliente): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => 'required|string|max:200',
            'telefono'  => 'nullable|string|max:50',
            'direccion' => 'nullable|string|max:300',
            'notas'     => 'nullable|string|max:1000',
        ]);

        $cliente->update($data);
        return response()->json($cliente);
    }

    public function destroy(Cliente $cliente): JsonResponse
    {
        $cliente->delete();
        return response()->json(null, 204);
    }
}
