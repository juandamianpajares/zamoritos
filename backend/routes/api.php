<?php

use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\ImagenController;
use App\Http\Controllers\Api\ImportarCategoriasController;
use App\Http\Controllers\Api\MarcaController;
use App\Http\Controllers\Api\CompraController;
use App\Http\Controllers\Api\ImportarComprasController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ImportarCatalogoController;
use App\Http\Controllers\Api\LoteController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\ImportarProveedoresController;
use App\Http\Controllers\Api\ProveedorController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\PagoProveedorController;
use App\Http\Controllers\Api\VentaController;
use App\Http\Controllers\Api\ClienteController;
use App\Http\Controllers\Api\PedidoController;
use App\Http\Controllers\Api\ImportarClientesController;
use App\Http\Controllers\Api\WhatsappController;
use Illuminate\Support\Facades\Route;

Route::get('dashboard/stats',          [DashboardController::class, 'stats']);
Route::get('dashboard/ventas-dia',     [DashboardController::class, 'ventasDia']);
Route::get('dashboard/ventas-semana',      [DashboardController::class, 'ventasSemana']);
Route::get('dashboard/stock-movimientos',  [DashboardController::class, 'stockMovimientos']);
Route::get('dashboard/top-productos',  [DashboardController::class, 'topProductos']);
Route::get('dashboard/ganancia',       [DashboardController::class, 'ganancia']);
Route::get('dashboard/caja',           [DashboardController::class, 'caja']);
Route::get('dashboard/arqueo',         [DashboardController::class, 'arqueo']);
Route::post('dashboard/arqueo',        [DashboardController::class, 'guardarArqueo']);
Route::get('dashboard/arqueos',        [DashboardController::class, 'arqueos']);
Route::post('dashboard/caja-imagen',   [DashboardController::class, 'guardarImagenCaja']);

Route::get('categorias/tree',        [CategoriaController::class, 'tree']);
Route::post('categorias/importar',   [ImportarCategoriasController::class, 'store']);
Route::apiResource('categorias', CategoriaController::class)->except(['show']);
Route::get('marcas',             [MarcaController::class, 'index']);
// Rutas explícitas ANTES del apiResource para evitar conflictos de model binding
Route::post('productos/importar',              [ImportarCatalogoController::class, 'store']);
Route::post('productos/importar-sheets',      [ImportarCatalogoController::class, 'fromSheets']);
Route::apiResource('productos', ProductoController::class);
Route::post('productos/{producto}/fraccionar',        [ProductoController::class, 'fraccionar']);
Route::post('productos/{producto}/foto',              [ProductoController::class, 'uploadFoto']);
Route::patch('productos/{producto}/notificacion-stock',[ProductoController::class, 'toggleNotificacion']);
Route::patch('productos/{producto}/destacado',         [ProductoController::class, 'toggleDestacado']);
Route::put('productos/{producto}/combo-items',         [ProductoController::class, 'setComboItems']);

Route::get('imagenes/requisitos',   [ImagenController::class, 'requisitos']);
Route::post('imagenes/importar',    [ImagenController::class, 'importar']);
Route::post('proveedores/importar', [ImportarProveedoresController::class, 'store']);
Route::apiResource('proveedores', ProveedorController::class);
Route::patch('proveedores/{proveedor}/saldo',        [ProveedorController::class, 'actualizarSaldo']);
Route::patch('proveedores/{proveedor}/toggle-activo', [ProveedorController::class, 'toggleActivo']);
Route::post('compras/importar', [ImportarComprasController::class, 'store']);
Route::apiResource('compras', CompraController::class)->only(['index', 'show', 'store']);

// Pagos a proveedores
Route::get('cuentas-pagar',                              [PagoProveedorController::class, 'cuentasPagar']);
Route::get('pagos-proveedores',                          [PagoProveedorController::class, 'index']);
Route::post('pagos-proveedores',                         [PagoProveedorController::class, 'store']);
Route::post('pagos-proveedores/{pagoProveedor}/asociar', [PagoProveedorController::class, 'asociar']);

Route::get('stock/movimientos',       [StockController::class, 'index']);
Route::post('stock/ajuste',           [StockController::class, 'ajuste']);
Route::get('stock/bajo',              [StockController::class, 'bajo']);
Route::get('stock/balance-categorias',[StockController::class, 'balanceCategorias']);

Route::get('lotes', [LoteController::class, 'index']);

// Clientes
Route::post('clientes/importar',  [ImportarClientesController::class, 'store']);
Route::apiResource('clientes', ClienteController::class)->except(['show']);

// Pedidos
Route::patch('pedidos/{pedido}/estado', [PedidoController::class, 'cambiarEstado']);
Route::apiResource('pedidos', PedidoController::class)->only(['index', 'store', 'show']);

// WhatsApp
Route::get('whatsapp/status',   [WhatsappController::class, 'status']);
Route::get('whatsapp/qr',       [WhatsappController::class, 'qr']);
Route::post('whatsapp/conectar',[WhatsappController::class, 'conectar']);
Route::post('whatsapp/test',    [WhatsappController::class, 'test']);

Route::get('ventas',                       [VentaController::class, 'index']);
Route::post('ventas',                      [VentaController::class, 'store']);
Route::post('ventas/importar-sicfe',       [VentaController::class, 'importarSicfe']);
Route::get('ventas/{venta}',              [VentaController::class, 'show']);
Route::patch('ventas/{venta}/anular',     [VentaController::class, 'anular']);
Route::post('ventas/{venta}/devolucion',  [VentaController::class, 'devolucion']);
