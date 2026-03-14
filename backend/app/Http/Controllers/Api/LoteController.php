<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Lote::with('producto', 'compra')->orderBy('fecha_vencimiento');

        if ($request->filled('producto_id')) {
            $query->where('producto_id', $request->producto_id);
        }

        if ($request->boolean('proximos_a_vencer')) {
            $query->whereNotNull('fecha_vencimiento')
                  ->where('fecha_vencimiento', '<=', now()->addDays(30))
                  ->where('fecha_vencimiento', '>=', now())
                  ->where('cantidad_restante', '>', 0);
        }

        if ($request->boolean('vencidos')) {
            $query->whereNotNull('fecha_vencimiento')
                  ->where('fecha_vencimiento', '<', now())
                  ->where('cantidad_restante', '>', 0);
        }

        return response()->json($query->get());
    }
}
