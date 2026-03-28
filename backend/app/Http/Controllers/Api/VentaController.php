<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MovimientoStock;
use App\Models\Producto;
use App\Models\Venta;
use App\Services\VentaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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

        $perPage = min((int) $request->get('per_page', 50), 500);
        return response()->json($query->paginate($perPage));
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
            'numero_factura'                 => 'nullable|string|max:100',
            'usuario'                        => 'nullable|string|max:100',
            'observacion'                    => 'nullable|string',
            'detalles'                       => 'required|array|min:1',
            'detalles.*.producto_id'         => 'required|exists:productos,id',
            'detalles.*.cantidad'            => 'required|numeric|min:0.001',
            'detalles.*.precio_unitario'     => 'required|numeric',
            // Con envío
            'con_envio'                      => 'nullable|boolean',
            'cliente_id'                     => 'nullable|exists:clientes,id',
            'costo_envio'                    => 'nullable|numeric|min:0',
        ]);

        $venta = $this->ventaService->registrar($data);

        return response()->json($venta, 201);
    }

    public function anular(Venta $venta): JsonResponse
    {
        $venta = $this->ventaService->anular($venta);
        return response()->json($venta);
    }

    /** Importación masiva desde SICFE (sin deducción de stock) */
    public function importarSicfe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ventas'                      => 'required|array|min:1',
            'ventas.*.fecha'              => 'required|date',
            'ventas.*.tipo_comprobante'   => 'nullable|string|max:50',
            'ventas.*.receptor_nombre'    => 'nullable|string|max:200',
            'ventas.*.total'              => 'required|numeric|min:0',
            'ventas.*.medio_pago'         => 'nullable|string|max:50',
            'ventas.*.numero_factura'     => 'nullable|string|max:100',
        ]);

        $creadas = 0;
        foreach ($data['ventas'] as $v) {
            Venta::create([
                'fecha'             => $v['fecha'],
                'tipo_pago'         => 'contado',
                'medio_pago'        => $v['medio_pago'] ?? 'sicfe',
                'tipo_comprobante'  => $v['tipo_comprobante'] ?? 'e-Ticket',
                'numero_factura'    => $v['numero_factura'] ?? null,
                'receptor_nombre'   => $v['receptor_nombre'] ?? null,
                'moneda'            => 'UYU',
                'subtotal'          => $v['total'],
                'descuento'         => 0,
                'total'             => $v['total'],
                'estado'            => 'confirmada',
            ]);
            $creadas++;
        }

        return response()->json(['importadas' => $creadas]);
    }

    /** Devolución parcial de una venta */
    public function devolucion(Request $request, Venta $venta): JsonResponse
    {
        if ($venta->estado !== 'confirmada') {
            throw ValidationException::withMessages(['estado' => 'La venta no está confirmada.']);
        }

        $data = $request->validate([
            'detalles'               => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad'    => 'required|numeric|min:0.001',
        ]);

        return DB::transaction(function () use ($venta, $data) {
            $venta->load('detalles');
            $detallesOrig = $venta->detalles->keyBy('producto_id');
            $totalDevuelto = 0;

            foreach ($data['detalles'] as $d) {
                $detOrig = $detallesOrig->get($d['producto_id']);
                if (!$detOrig) continue;

                $precio = $detOrig->precio_unitario;
                $totalDevuelto += $d['cantidad'] * $precio;

                $producto = Producto::findOrFail($d['producto_id']);
                $producto->increment('stock', $d['cantidad']);

                MovimientoStock::create([
                    'producto_id' => $d['producto_id'],
                    'tipo'        => 'ajuste',
                    'cantidad'    => $d['cantidad'],
                    'referencia'  => 'devolucion venta #' . $venta->id,
                    'observacion' => 'Mercadería devuelta',
                ]);
            }

            $devolucion = Venta::create([
                'fecha'             => now()->toDateTimeString(),
                'tipo_pago'         => $venta->tipo_pago,
                'medio_pago'        => $venta->medio_pago,
                'tipo_comprobante'  => 'devolucion',
                'moneda'            => 'UYU',
                'subtotal'          => -$totalDevuelto,
                'descuento'         => 0,
                'total'             => -$totalDevuelto,
                'estado'            => 'confirmada',
                'observacion'       => 'Devolución parcial de venta #' . $venta->id,
            ]);

            return response()->json([
                'total_devuelto' => round($totalDevuelto, 2),
                'devolucion_id'  => $devolucion->id,
            ]);
        });
    }
}
