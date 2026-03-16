<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Compra;
use App\Models\DetalleCompra;
use App\Models\DetalleVenta;
use App\Models\Lote;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Models\Venta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $productosStockBajo = Producto::with('categoria')
            ->where('activo', true)
            ->where('notificar_stock_bajo', true)
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

        return response()->json([
            'fecha'           => $hoy,
            'total'           => $total,
            'cantidad'        => $cantidad,
            'ticket_promedio' => $ticketProm,
            'por_medio_pago'  => $porMedioPago,
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

    public function caja(Request $request): JsonResponse
    {
        $fecha = $request->get('fecha', now()->toDateString());

        $ventas = Venta::with('detalles')
            ->where('estado', 'confirmada')
            ->whereDate('fecha', $fecha)
            ->get();

        $ventasPorMedio = $ventas
            ->groupBy(fn($v) => $v->medio_pago ?? 'sin especificar')
            ->map(fn($g, $medio) => [
                'medio'    => $medio,
                'total'    => round($g->sum('total'), 2),
                'cantidad' => $g->count(),
            ])
            ->values();

        $compras = Compra::with('proveedor', 'detalles.producto')
            ->whereDate('fecha', $fecha)
            ->orderByDesc('fecha')
            ->get();

        $comprasPorProveedor = $compras
            ->groupBy(fn($c) => $c->proveedor?->nombre ?? 'Sin proveedor')
            ->map(fn($g, $prov) => [
                'proveedor' => $prov,
                'total'     => round($g->sum('total'), 2),
                'cantidad'  => $g->count(),
            ])
            ->values();

        return response()->json([
            'fecha'               => $fecha,
            'total_ventas'        => round($ventas->sum('total'), 2),
            'cantidad_ventas'     => $ventas->count(),
            'ventas_por_medio'    => $ventasPorMedio,
            'total_compras'       => round($compras->sum('total'), 2),
            'cantidad_compras'    => $compras->count(),
            'compras_por_prov'    => $comprasPorProveedor,
            'compras'             => $compras,
        ]);
    }

    public function ganancia(Request $request): JsonResponse
    {
        $periodo = $request->get('periodo', 'hoy');

        $desde = match ($periodo) {
            'semana' => now()->startOfWeek(),
            'mes'    => now()->startOfMonth(),
            default  => now()->startOfDay(),
        };

        // Total ventas del período
        $totalVentas = (float) Venta::where('estado', 'confirmada')
            ->where('fecha', '>=', $desde)
            ->sum('total');

        // Total compras reales del período (egreso)
        $totalCompras = (float) Compra::where('fecha', '>=', $desde)->sum('total');

        // Ganancia = ingresos (ventas) − egresos (compras)
        $gananciaNeta = $totalVentas - $totalCompras;
        $margenPct    = $totalVentas > 0 ? round(($gananciaNeta / $totalVentas) * 100, 1) : 0;

        // Por proveedor (usando precio_compra del producto)
        $ventasPorProveedor = DetalleVenta::select(
                'proveedores.id as proveedor_id',
                'proveedores.nombre as proveedor',
                DB::raw('SUM(detalle_ventas.subtotal) as total_ventas'),
                DB::raw('SUM(detalle_ventas.cantidad * productos.precio_compra) as total_costo'),
            )
            ->join('ventas', 'detalle_ventas.venta_id', '=', 'ventas.id')
            ->join('productos', 'detalle_ventas.producto_id', '=', 'productos.id')
            ->join('detalle_compras', 'detalle_compras.producto_id', '=', 'productos.id')
            ->join('compras', 'detalle_compras.compra_id', '=', 'compras.id')
            ->join('proveedores', 'compras.proveedor_id', '=', 'proveedores.id')
            ->where('ventas.estado', 'confirmada')
            ->where('ventas.fecha', '>=', $desde)
            ->whereNotNull('productos.precio_compra')
            ->groupBy('proveedores.id', 'proveedores.nombre')
            ->orderByDesc('total_ventas')
            ->get()
            ->map(fn($r) => [
                'proveedor'    => $r->proveedor ?? 'Sin proveedor',
                'total_ventas' => (float) $r->total_ventas,
                'total_costo'  => (float) $r->total_costo,
                'ganancia'     => (float) ($r->total_ventas - $r->total_costo),
                'margen_pct'   => $r->total_ventas > 0
                    ? round((($r->total_ventas - $r->total_costo) / $r->total_ventas) * 100, 1)
                    : 0,
            ]);

        return response()->json([
            'periodo'        => $periodo,
            'desde'          => $desde->toDateString(),
            'total_ventas'   => round($totalVentas, 2),
            'total_compras'  => round($totalCompras, 2),
            'total_costo'    => round($totalCompras, 2),
            'ganancia_neta'  => round($gananciaNeta, 2),
            'margen_pct'     => $margenPct,
            'por_proveedor'  => $ventasPorProveedor,
        ]);
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
