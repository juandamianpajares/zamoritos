<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArqueoCaja;
use App\Models\Compra;
use App\Models\DetalleVenta;
use App\Models\Lote;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Models\Venta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $productosStockBajo = Producto::with('categoria')
            ->where('activo', true)
            ->where('stock', '<=', 5)
            ->orderBy('stock')
            ->get();

        $proximosVencer = Lote::with('producto')
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<=', now()->addDays(30))
            ->where('fecha_vencimiento', '>=', now())
            ->where('cantidad_restante', '>', 0)
            ->orderBy('fecha_vencimiento')
            ->get();

        return response()->json([
            'total_productos'       => Producto::where('activo', true)->count(),
            'total_proveedores'     => Proveedor::where('activo', true)->count(),
            'total_compras'         => Compra::count(),
            'stock_bajo_count'      => $productosStockBajo->count(),
            'proximos_vencer_count' => $proximosVencer->count(),
            'productos_stock_bajo'  => $productosStockBajo,
            'proximos_vencer'       => $proximosVencer,
        ]);
    }

    public function ventasDia(): JsonResponse
    {
        $hoy = now()->toDateString();

        $ventas = Venta::with('detalles.producto')
            ->whereDate('fecha', $hoy)
            ->where('estado', 'confirmada')
            ->orderByDesc('fecha')
            ->get();

        $total      = $ventas->sum('total');
        $cantidad   = $ventas->count();
        $ticketProm = $cantidad > 0 ? round($total / $cantidad, 2) : 0;

        $porMedioPago = $ventas
            ->groupBy(fn($v) => $v->medio_pago ?? 'sin especificar')
            ->map(fn($grupo, $medio) => [
                'medio'    => $medio,
                'total'    => round($grupo->sum('total'), 2),
                'cantidad' => $grupo->count(),
            ])
            ->values();

        $conFactura = $ventas->filter(fn($v) => !empty($v->numero_factura) && $v->numero_factura !== '0');
        $sinFactura = $ventas->filter(fn($v) => empty($v->numero_factura) || $v->numero_factura === '0');

        return response()->json([
            'fecha'           => $hoy,
            'total'           => $total,
            'cantidad'        => $cantidad,
            'ticket_promedio' => $ticketProm,
            'por_medio_pago'  => $porMedioPago,
            'con_factura'     => ['cantidad' => $conFactura->count(), 'total' => round($conFactura->sum('total'), 2)],
            'sin_factura'     => ['cantidad' => $sinFactura->count(), 'total' => round($sinFactura->sum('total'), 2)],
            'ventas'          => $ventas,
        ]);
    }

    public function ventasSemana(): JsonResponse
    {
        $inicio = now()->subDays(6)->startOfDay();

        $ventasPorDia = Venta::select(
                DB::raw('DATE(fecha) as dia'),
                DB::raw('SUM(total) as total'),
                DB::raw('COUNT(*) as cantidad')
            )
            ->where('estado', 'confirmada')
            ->where('fecha', '>=', $inicio)
            ->groupBy('dia')
            ->get()
            ->keyBy('dia');

        $dias = collect(range(6, 0))->map(function ($i) use ($ventasPorDia) {
            $fecha = now()->subDays($i)->toDateString();
            return [
                'fecha'    => $fecha,
                'total'    => (float) ($ventasPorDia[$fecha]->total ?? 0),
                'cantidad' => (int) ($ventasPorDia[$fecha]->cantidad ?? 0),
            ];
        });

        return response()->json($dias);
    }

    public function ganancia(Request $request): JsonResponse
    {
        $periodo = $request->get('periodo', 'mes');

        $desde = match ($periodo) {
            'hoy'    => now()->startOfDay(),
            'semana' => now()->startOfWeek(),
            default  => now()->startOfMonth(),
        };

        // Total ventas confirmadas del período
        $totalVentas = Venta::where('estado', 'confirmada')
            ->where('fecha', '>=', $desde)
            ->sum('total');

        // Total compras del período (egresos reales)
        $totalCompras = Compra::where('fecha', '>=', $desde)->sum('total');

        // Detalles de ventas del período con precio_compra del producto
        $detalles = DetalleVenta::whereHas('venta', fn($q) =>
                $q->where('estado', 'confirmada')->where('fecha', '>=', $desde)
            )
            ->with('producto:id,precio_compra')
            ->get();

        // Costo de lo vendido
        $totalCosto = $detalles->sum(fn($d) => $d->cantidad * ($d->producto?->precio_compra ?? 0));

        $gananciaNeta = $totalVentas - $totalCosto;
        $margenPct    = $totalVentas > 0 ? round($gananciaNeta / $totalVentas * 100, 1) : 0;

        // Último proveedor por producto (por compra_id más reciente)
        $proveedorPorProducto = DB::table('detalle_compras as dc')
            ->joinSub(
                DB::table('detalle_compras')
                    ->select('producto_id', DB::raw('MAX(compra_id) as max_compra_id'))
                    ->groupBy('producto_id'),
                'latest',
                fn($j) => $j->on('dc.producto_id', '=', 'latest.producto_id')
                             ->on('dc.compra_id', '=', 'latest.max_compra_id')
            )
            ->join('compras', 'dc.compra_id', '=', 'compras.id')
            ->join('proveedores', 'compras.proveedor_id', '=', 'proveedores.id')
            ->select('dc.producto_id', 'proveedores.nombre as proveedor')
            ->get()
            ->pluck('proveedor', 'producto_id');

        // Ganancia agrupada por proveedor
        $porProveedor = $detalles
            ->groupBy(fn($d) => $proveedorPorProducto[$d->producto_id] ?? 'Sin proveedor')
            ->map(function ($grupo, $proveedor) {
                $tv   = $grupo->sum('subtotal');
                $tc   = $grupo->sum(fn($d) => $d->cantidad * ($d->producto?->precio_compra ?? 0));
                $gan  = $tv - $tc;
                return [
                    'proveedor'    => $proveedor,
                    'total_ventas' => round($tv, 2),
                    'total_costo'  => round($tc, 2),
                    'ganancia'     => round($gan, 2),
                    'margen_pct'   => $tv > 0 ? round($gan / $tv * 100, 1) : 0,
                ];
            })
            ->sortByDesc('total_ventas')
            ->values();

        return response()->json([
            'periodo'       => $periodo,
            'desde'         => $desde->toDateString(),
            'total_ventas'  => round((float) $totalVentas, 2),
            'total_compras' => round((float) $totalCompras, 2),
            'total_costo'   => round($totalCosto, 2),
            'ganancia_neta' => round($gananciaNeta, 2),
            'margen_pct'    => $margenPct,
            'por_proveedor' => $porProveedor,
        ]);
    }

    public function caja(Request $request): JsonResponse
    {
        $fecha = $request->get('fecha', now()->toDateString());

        $ventas = Venta::whereDate('fecha', $fecha)
            ->where('estado', 'confirmada')
            ->get();

        $porMedioPago = $ventas
            ->groupBy(fn($v) => $v->medio_pago ?? 'sin especificar')
            ->map(fn($grupo, $medio) => [
                'medio'    => $medio,
                'total'    => round($grupo->sum('total'), 2),
                'cantidad' => $grupo->count(),
            ])
            ->values();

        $compras = Compra::with('proveedor', 'detalles.producto')
            ->whereDate('fecha', $fecha)
            ->get();

        $porProveedor = $compras
            ->groupBy(fn($c) => $c->proveedor?->nombre ?? 'Sin proveedor')
            ->map(fn($grupo, $prov) => [
                'proveedor' => $prov,
                'total'     => round($grupo->sum('total'), 2),
                'cantidad'  => $grupo->count(),
            ])
            ->values();

        $arqueo = ArqueoCaja::whereDate('fecha', $fecha)->first();

        return response()->json([
            'fecha'            => $fecha,
            'total_ventas'     => round($ventas->sum('total'), 2),
            'cantidad_ventas'  => $ventas->count(),
            'ventas_por_medio' => $porMedioPago,
            'total_compras'    => round($compras->sum('total'), 2),
            'cantidad_compras' => $compras->count(),
            'compras_por_prov' => $porProveedor,
            'compras'          => $compras,
            'arqueo'           => $arqueo,
        ]);
    }

    public function arqueo(Request $request): JsonResponse
    {
        $fecha  = $request->get('fecha', now()->toDateString());
        $arqueo = ArqueoCaja::whereDate('fecha', $fecha)->first();
        return response()->json($arqueo);
    }

    public function guardarArqueo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fecha'          => 'required|date',
            'denominaciones' => 'required|array',
            'fondo_cambio'   => 'required|numeric|min:0',
            'total_contado'  => 'required|numeric|min:0',
            'total_esperado' => 'required|numeric|min:0',
            'diferencia'     => 'required|numeric',
            'observacion'    => 'nullable|string|max:500',
        ]);

        $arqueo = ArqueoCaja::updateOrCreate(
            ['fecha' => $data['fecha']],
            $data
        );

        return response()->json($arqueo);
    }

    public function topProductos(Request $request): JsonResponse
    {
        $periodo = $request->get('periodo', 'mes');

        $desde = match ($periodo) {
            'hoy'    => now()->startOfDay(),
            'semana' => now()->startOfWeek(),
            default  => now()->startOfMonth(),
        };

        $top = DetalleVenta::select(
                'producto_id',
                DB::raw('SUM(cantidad) as total_unidades'),
                DB::raw('SUM(subtotal) as total_ingresos')
            )
            ->whereHas('venta', fn($q) =>
                $q->where('estado', 'confirmada')->where('fecha', '>=', $desde)
            )
            ->with('producto.categoria')
            ->groupBy('producto_id')
            ->orderByDesc('total_unidades')
            ->limit(10)
            ->get()
            ->map(fn($d) => [
                'producto_id'    => $d->producto_id,
                'nombre'         => $d->producto?->nombre,
                'categoria'      => $d->producto?->categoria?->nombre,
                'unidad_medida'  => $d->producto?->unidad_medida,
                'total_unidades' => (float) $d->total_unidades,
                'total_ingresos' => (float) $d->total_ingresos,
            ]);

        return response()->json([
            'periodo' => $periodo,
            'desde'   => $desde->toDateString(),
            'top'     => $top,
        ]);
    }
}
