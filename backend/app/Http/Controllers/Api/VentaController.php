<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venta;
use App\Services\VentaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VentaController extends Controller
{
    public function __construct(private readonly VentaService $ventaService) {}

    public function index(Request $request): JsonResponse
    {
        $query = Venta::with('detalles.producto')
            ->orderByDesc('fecha');

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('fecha_desde')) {
            $query->whereDate('fecha', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('fecha', '<=', $request->fecha_hasta);
        }

        return response()->json($query->paginate(50));
    }

    public function show(Venta $venta): JsonResponse
    {
        return response()->json($venta->load('detalles.producto'));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fecha'                          => 'required|date',
            'tipo_pago'                      => 'required|in:contado,credito',
            'medio_pago'                     => 'nullable|string|max:100',
            'medios_pago'                    => 'nullable|array|min:1',
            'medios_pago.*.medio'            => 'required_with:medios_pago|string',
            'medios_pago.*.monto'            => 'required_with:medios_pago|numeric|min:0',
            'receptor_nombre'                => 'nullable|string|max:200',
            'usuario'                        => 'nullable|string|max:100',
            'observacion'                    => 'nullable|string',
            'detalles'                       => 'required|array|min:1',
            'detalles.*.producto_id'         => 'required|exists:productos,id',
            'detalles.*.cantidad'            => 'required|numeric|min:0.001',
            'detalles.*.precio_unitario'     => 'required|numeric|min:0',
        ]);

        $venta = $this->ventaService->registrar($data);

        return response()->json($venta, 201);
    }

    public function anular(Venta $venta): JsonResponse
    {
        $venta = $this->ventaService->anular($venta);
        return response()->json($venta);
    }
}
