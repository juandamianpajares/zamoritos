<?php

use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\CompraController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LoteController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\ProveedorController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\VentaController;
use Illuminate\Support\Facades\Route;

Route::get('dashboard/stats', [DashboardController::class, 'stats']);

Route::apiResource('categorias', CategoriaController::class)->except(['show']);
Route::apiResource('productos', ProductoController::class);
Route::apiResource('proveedores', ProveedorController::class);
Route::apiResource('compras', CompraController::class)->only(['index', 'show', 'store']);

Route::get('stock/movimientos', [StockController::class, 'index']);
Route::post('stock/ajuste', [StockController::class, 'ajuste']);
Route::get('stock/bajo', [StockController::class, 'bajo']);

Route::get('lotes', [LoteController::class, 'index']);

Route::get('ventas',                  [VentaController::class, 'index']);
Route::post('ventas',                 [VentaController::class, 'store']);
Route::get('ventas/{venta}',          [VentaController::class, 'show']);
Route::patch('ventas/{venta}/anular', [VentaController::class, 'anular']);
