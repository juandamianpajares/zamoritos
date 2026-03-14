<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Compra;
use App\Models\Lote;
use App\Models\Producto;
use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;

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
}
