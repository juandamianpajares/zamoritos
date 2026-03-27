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
use Illuminate\Support\Carbon;

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

        $hoy   = Carbon::today();
        $en15  = Carbon::today()->addDays(15);

        $pagosVencidos = Compra::with('proveedor')
            ->whereIn('estado_pago', ['pendiente', 'parcial'])
            ->where('tipo_pago', 'diferido')
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<', $hoy)
            ->orderBy('fecha_vencimiento')
            ->get()
            ->map(fn($c) => [
                'id'          => $c->id,
                'proveedor'   => $c->proveedor?->nombre ?? 'Sin proveedor',
                'factura'     => $c->factura ?? null,
                'total'       => (float) $c->total,
                'saldo'       => round((float) $c->total - (float) $c->monto_pagado, 2),
                'vencimiento' => $c->fecha_vencimiento?->toDateString(),
                'dias_atraso' => $hoy->diffInDays($c->fecha_vencimiento),
            ]);

        $pagosProximos15 = Compra::with('proveedor')
            ->whereIn('estado_pago', ['pendiente', 'parcial'])
            ->where('tipo_pago', 'diferido')
            ->whereNotNull('fecha_vencimiento')
            ->whereBetween('fecha_vencimiento', [$hoy, $en15])
            ->orderBy('fecha_vencimiento')
            ->get()
            ->map(fn($c) => [
                'id'          => $c->id,
                'proveedor'   => $c->proveedor?->nombre ?? 'Sin proveedor',
                'factura'     => $c->factura ?? null,
                'total'       => (float) $c->total,
                'saldo'       => round((float) $c->total - (float) $c->monto_pagado, 2),
                'vencimiento' => $c->fecha_vencimiento?->toDateString(),
                'dias_para_vencer' => $hoy->diffInDays($c->fecha_vencimiento),
            ]);

        return response()->json([
            'total_productos'        => Producto::where('activo', true)->count(),
            'total_proveedores'      => Proveedor::where('activo', true)->count(),
            'total_compras'          => Compra::count(),
            'stock_bajo_count'       => $productosStockBajo->count(),
            'proximos_vencer_count'  => $proximosVencer->count(),
            'pagos_vencidos_count'   => $pagosVencidos->count(),
            'pagos_proximos15_count' => $pagosProximos15->count(),
            'productos_stock_bajo'   => $productosStockBajo,
            'proximos_vencer'        => $proximosVencer,
            'pagos_vencidos'         => $pagosVencidos,
            'pagos_proximos_15'      => $pagosProximos15,
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

    public function ventasSemana(Request $request): JsonResponse
    {
        $dias  = (int) $request->get('dias', 7);
        $dias  = min(max($dias, 7), 365);
        $inicio = now()->subDays($dias - 1)->startOfDay();

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

        $costoPorDia = DB::table('detalle_ventas as dv')
            ->join('ventas as v', 'v.id', '=', 'dv.venta_id')
            ->join('productos as p', 'p.id', '=', 'dv.producto_id')
            ->select(
                DB::raw('DATE(v.fecha) as dia'),
                DB::raw('SUM(dv.cantidad * COALESCE(p.precio_compra, 0)) as costo')
            )
            ->where('v.estado', 'confirmada')
            ->where('v.fecha', '>=', $inicio)
            ->groupBy('dia')
            ->get()
            ->keyBy('dia');

        $result = collect(range($dias - 1, 0))->map(function ($i) use ($ventasPorDia, $costoPorDia) {
            $fecha = now()->subDays($i)->toDateString();
            $total = (float) ($ventasPorDia[$fecha]->total ?? 0);
            $costo = (float) ($costoPorDia[$fecha]->costo ?? 0);
            return [
                'fecha'         => $fecha,
                'total'         => $total,
                'cantidad'      => (int) ($ventasPorDia[$fecha]->cantidad ?? 0),
                'ganancia_neta' => round($total - $costo, 2),
            ];
        });

        return response()->json($result);
    }

    public function stockMovimientos(Request $request): JsonResponse
    {
        $dias  = (int) $request->get('dias', 7);
        $dias  = min(max($dias, 7), 365);
        $inicio = now()->subDays($dias - 1)->startOfDay();

        $movs = DB::table('movimientos_stock')
            ->select(
                DB::raw('DATE(fecha) as dia'),
                DB::raw('SUM(CASE WHEN cantidad > 0 THEN cantidad ELSE 0 END) as ingresos'),
                DB::raw('SUM(CASE WHEN cantidad < 0 THEN ABS(cantidad) ELSE 0 END) as egresos')
            )
            ->where('fecha', '>=', $inicio)
            ->groupBy('dia')
            ->get()
            ->keyBy('dia');

        $result = collect(range($dias - 1, 0))->map(function ($i) use ($movs) {
            $fecha = now()->subDays($i)->toDateString();
            return [
                'fecha'    => $fecha,
                'ingresos' => (float) ($movs[$fecha]->ingresos ?? 0),
                'egresos'  => (float) ($movs[$fecha]->egresos ?? 0),
            ];
        });

        return response()->json($result);
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

        // Sumar por medio de pago desglosando los pagos combinados
        $acum = [];   // ['efectivo' => ['total' => X, 'cantidad' => Y], ...]
        foreach ($ventas as $v) {
            $medios = $v->medios_pago;   // JSON: [{medio, monto}, ...]
            if (!empty($medios) && is_array($medios)) {
                // Pago combinado: sumar cada porción al medio correspondiente
                foreach ($medios as $linea) {
                    $m = $linea['medio'] ?? 'sin especificar';
                    $acum[$m]['total']    = ($acum[$m]['total']    ?? 0) + ($linea['monto'] ?? 0);
                    $acum[$m]['cantidad'] = ($acum[$m]['cantidad'] ?? 0) + 1;
                }
            } else {
                // Pago simple
                $m = $v->medio_pago ?? 'sin especificar';
                $acum[$m]['total']    = ($acum[$m]['total']    ?? 0) + $v->total;
                $acum[$m]['cantidad'] = ($acum[$m]['cantidad'] ?? 0) + 1;
            }
        }
        $porMedioPago = collect($acum)
            ->map(fn($d, $medio) => [
                'medio'    => $medio,
                'total'    => round($d['total'], 2),
                'cantidad' => $d['cantidad'],
            ])
            ->values();

        $compras = Compra::with('proveedor', 'detalles.producto')
            ->whereDate('fecha', $fecha)
            ->get();

        // Solo compras CONTADO mueven caja en el día
        $comprasContado  = $compras->where('tipo_pago', 'contado');
        $comprasDiferido = $compras->where('tipo_pago', 'diferido');

        $porProveedor = $comprasContado
            ->groupBy(fn($c) => $c->proveedor?->nombre ?? 'Sin proveedor')
            ->map(fn($grupo, $prov) => [
                'proveedor' => $prov,
                'total'     => round($grupo->sum('total'), 2),
                'cantidad'  => $grupo->count(),
            ])
            ->values();

        // Compras diferidas que VENCEN HOY
        $vencimientosHoy = Compra::with('proveedor')
            ->where('tipo_pago', 'diferido')
            ->whereIn('estado_pago', ['pendiente', 'parcial'])
            ->whereDate('fecha_vencimiento', now()->toDateString())
            ->get()
            ->map(fn($c) => [
                'id'         => $c->id,
                'proveedor'  => $c->proveedor?->nombre ?? 'Sin proveedor',
                'total'      => $c->total,
                'saldo'      => round($c->total - $c->monto_pagado, 2),
                'factura'    => $c->factura,
                'vencimiento'=> $c->fecha_vencimiento?->toDateString(),
            ]);

        $arqueo = ArqueoCaja::whereDate('fecha', $fecha)->first();

        return response()->json([
            'fecha'              => $fecha,
            'total_ventas'       => round($ventas->sum('total'), 2),
            'cantidad_ventas'    => $ventas->count(),
            'ventas_por_medio'   => $porMedioPago,
            'total_compras'      => round($comprasContado->sum('total'), 2),
            'cantidad_compras'   => $comprasContado->count(),
            'total_diferido'     => round($comprasDiferido->sum('total'), 2),
            'cantidad_diferido'  => $comprasDiferido->count(),
            'compras_por_prov'   => $porProveedor,
            'compras'            => $compras,
            'vencimientos_hoy'   => $vencimientosHoy,
            'arqueo'             => $arqueo,
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

    /**
     * Recibe la imagen del cierre de caja generada en el frontend (Canvas → WebP)
     * y la guarda en storage/app/public/imagenes_comprobantes/caja_{fecha}.webp.
     * Devuelve la URL pública relativa.
     */
    public function guardarImagenCaja(Request $request): JsonResponse
    {
        $request->validate([
            'fecha'  => 'required|date',
            'imagen' => 'required|string', // base64 data URL
        ]);

        $fecha   = $request->fecha;
        $dataUrl = $request->imagen;

        // Decodificar base64 — acepta webp, png o jpeg
        if (!preg_match('/^data:image\/(webp|png|jpeg);base64,(.+)$/', $dataUrl, $m)) {
            return response()->json(['error' => 'Formato de imagen inválido.'], 422);
        }
        $bytes = base64_decode($m[2]);
        if (!$bytes) {
            return response()->json(['error' => 'No se pudo decodificar la imagen.'], 422);
        }

        // Siempre guardar con extensión .png para máxima compatibilidad
        $ext  = $m[1] === 'webp' ? 'webp' : 'png';
        $dir  = 'imagenes_comprobantes';
        $file = "caja_{$fecha}.{$ext}";
        $path = "{$dir}/{$file}";

        \Illuminate\Support\Facades\Storage::disk('public')->put($path, $bytes);

        return response()->json(['url' => '/storage/' . $path]);
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
