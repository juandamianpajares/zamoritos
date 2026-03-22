<?php

use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\ImagenController;
use App\Http\Controllers\Api\MarcaController;
use App\Http\Controllers\Api\CompraController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ImportarCatalogoController;
use App\Http\Controllers\Api\LoteController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\ProveedorController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\VentaController;
use Illuminate\Support\Facades\Route;

Route::get('dashboard/stats',          [DashboardController::class, 'stats']);
Route::get('dashboard/ventas-dia',     [DashboardController::class, 'ventasDia']);
Route::get('dashboard/ventas-semana',  [DashboardController::class, 'ventasSemana']);
Route::get('dashboard/top-productos',  [DashboardController::class, 'topProductos']);
Route::get('dashboard/ganancia',       [DashboardController::class, 'ganancia']);
Route::get('dashboard/caja',           [DashboardController::class, 'caja']);
Route::get('dashboard/arqueo',         [DashboardController::class, 'arqueo']);
Route::post('dashboard/arqueo',        [DashboardController::class, 'guardarArqueo']);

Route::get('categorias/tree',   [CategoriaController::class, 'tree']);
Route::apiResource('categorias', CategoriaController::class)->except(['show']);
Route::get('marcas',             [MarcaController::class, 'index']);
// Rutas explícitas ANTES del apiResource para evitar conflictos de model binding
Route::post('productos/importar',              [ImportarCatalogoController::class, 'store']);
Route::post('productos/importar-sheets',      [ImportarCatalogoController::class, 'fromSheets']);
Route::apiResource('productos', ProductoController::class);
Route::post('productos/{producto}/fraccionar', [ProductoController::class, 'fraccionar']);
Route::post('productos/{producto}/foto',       [ProductoController::class, 'uploadFoto']);

Route::get('imagenes/requisitos',   [ImagenController::class, 'requisitos']);
Route::post('imagenes/importar',    [ImagenController::class, 'importar']);
Route::apiResource('proveedores', ProveedorController::class);
Route::apiResource('compras', CompraController::class)->only(['index', 'show', 'store']);

Route::get('stock/movimientos',       [StockController::class, 'index']);
Route::post('stock/ajuste',           [StockController::class, 'ajuste']);
Route::get('stock/bajo',              [StockController::class, 'bajo']);
Route::get('stock/balance-categorias',[StockController::class, 'balanceCategorias']);

Route::get('lotes', [LoteController::class, 'index']);

Route::get('ventas',                       [VentaController::class, 'index']);
Route::post('ventas',                      [VentaController::class, 'store']);
Route::post('ventas/importar-sicfe',       [VentaController::class, 'importarSicfe']);
Route::get('ventas/{venta}',              [VentaController::class, 'show']);
Route::patch('ventas/{venta}/anular',     [VentaController::class, 'anular']);
Route::post('ventas/{venta}/devolucion',  [VentaController::class, 'devolucion']);
