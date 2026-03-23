<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Compra;
use App\Models\DetalleCompra;
use App\Models\Lote;
use App\Models\MovimientoStock;
use App\Models\Producto;
use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Importa compras desde CSV.
 *
 * Columnas (separador ;):
 *   factura ; fecha ; rut ; codigo_barras ; cantidad ; precio_compra ; fecha_vencimiento
 *
 * Reglas:
 *  - Filas con el mismo `factura` → una sola Compra (agrupadas)
 *  - Si `factura` está vacío → una Compra por fila
 *  - Si la factura ya existe en la base de datos → se omite (idempotente)
 *  - `rut` matchea por RUT exacto en proveedores; si no existe → null
 *  - `codigo_barras` debe existir en productos
 *  - Cada fila genera: DetalleCompra + incremento de stock + MovimientoStock + Lote
 */
class ImportarComprasController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate(['archivo' => 'required|file|mimes:csv,txt|max:5120']);

        $path   = $request->file('archivo')->getRealPath();
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return response()->json(['error' => 'No se pudo leer el archivo.'], 422);
        }

        $primeraLinea = fgets($handle);
        rewind($handle);
        $sep = str_contains($primeraLinea, ';') ? ';' : ',';

        $cabecera = fgetcsv($handle, 0, $sep);
        if (!$cabecera) {
            fclose($handle);
            return response()->json(['error' => 'Archivo vacío o sin cabecera.'], 422);
        }
        $cabecera = array_map(fn($c) => mb_strtolower(trim($c)), $cabecera);

        $requeridos = ['codigo_barras', 'cantidad', 'precio_compra'];
        $faltantes  = array_diff($requeridos, $cabecera);
        if ($faltantes) {
            fclose($handle);
            return response()->json(['error' => 'Faltan columnas: ' . implode(', ', $faltantes)], 422);
        }

        // Cache
        $provCache     = Proveedor::all()->keyBy('rut');
        $prodPorCodigo = Producto::where('activo', true)->whereNotNull('codigo_barras')
                                  ->get()->keyBy('codigo_barras');

        // Leer todas las filas y agrupar por factura
        $grupos = [];   // key = factura (o "row_{n}" si vacío)
        $fila   = 1;
        $sinFacIdx = 0;

        while (($row = fgetcsv($handle, 0, $sep)) !== false) {
            $fila++;
            if (count(array_filter($row, fn($v) => trim($v) !== '')) === 0) continue;
            if (count($row) < count($cabecera)) $row = array_pad($row, count($cabecera), '');
            $data = array_combine($cabecera, array_map('trim', $row));

            $facturaRaw = $data['factura'] ?? '';
            $key = $facturaRaw !== '' ? $facturaRaw : ('__sin_' . (++$sinFacIdx));

            if (!isset($grupos[$key])) {
                $grupos[$key] = [
                    'factura'   => $facturaRaw ?: null,
                    'fecha'     => $data['fecha'] ?? date('Y-m-d'),
                    'rut'       => $data['rut'] ?? '',
                    'filas'     => [],
                ];
            }
            $grupos[$key]['filas'][] = ['data' => $data, 'fila' => $fila];
        }
        fclose($handle);

        $creadas  = 0;
        $omitidas = 0;
        $errores  = [];

        foreach ($grupos as $key => $grupo) {
            // Idempotente: si la factura ya existe → omitir
            if ($grupo['factura'] && Compra::where('factura', $grupo['factura'])->exists()) {
                $omitidas++;
                continue;
            }

            // Resolver proveedor por RUT
            $rut         = trim($grupo['rut']);
            $proveedor   = $rut ? $provCache->get($rut) : null;
            $proveedorId = $proveedor?->id;

            // Validar y construir detalles
            $detalles = [];
            foreach ($grupo['filas'] as ['data' => $data, 'fila' => $nFila]) {
                $codigo   = $data['codigo_barras'] ?? '';
                $cantidad = (float) str_replace(',', '.', $data['cantidad'] ?? '');
                $precio   = (float) str_replace(['.', ','], ['', '.'], $data['precio_compra'] ?? '');

                if (!$codigo || !isset($prodPorCodigo[$codigo])) {
                    $errores[] = ['fila' => $nFila, 'error' => "Código de barras no encontrado: '{$codigo}'"];
                    continue;
                }
                if ($cantidad <= 0) {
                    $errores[] = ['fila' => $nFila, 'error' => "Cantidad inválida en fila {$nFila}"];
                    continue;
                }

                $detalles[] = [
                    'producto'          => $prodPorCodigo[$codigo],
                    'cantidad'          => $cantidad,
                    'precio_compra'     => $precio,
                    'fecha_vencimiento' => ($data['fecha_vencimiento'] ?? '') ?: null,
                ];
            }

            if (empty($detalles)) continue;

            // Calcular fecha (puede venir en distintos formatos)
            $fechaRaw = $grupo['fecha'];
            try {
                $fecha = (new \DateTime($fechaRaw))->format('Y-m-d');
            } catch (\Throwable) {
                $fecha = date('Y-m-d');
            }

            try {
                DB::transaction(function () use ($grupo, $proveedorId, $fecha, $detalles, &$creadas) {
                    $total = collect($detalles)->sum(fn($d) => $d['cantidad'] * $d['precio_compra']);

                    $compra = Compra::create([
                        'proveedor_id' => $proveedorId,
                        'fecha'        => $fecha,
                        'factura'      => $grupo['factura'],
                        'total'        => $total,
                        'nota'         => 'Importado por CSV',
                    ]);

                    foreach ($detalles as $d) {
                        $subtotal = $d['cantidad'] * $d['precio_compra'];

                        DetalleCompra::create([
                            'compra_id'     => $compra->id,
                            'producto_id'   => $d['producto']->id,
                            'cantidad'      => $d['cantidad'],
                            'precio_compra' => $d['precio_compra'],
                            'subtotal'      => $subtotal,
                        ]);

                        $d['producto']->increment('stock', $d['cantidad']);
                        $d['producto']->update(['precio_compra' => $d['precio_compra']]);

                        MovimientoStock::create([
                            'producto_id' => $d['producto']->id,
                            'tipo'        => 'ingreso',
                            'cantidad'    => $d['cantidad'],
                            'referencia'  => 'compra #' . $compra->id,
                            'observacion' => 'Factura: ' . ($grupo['factura'] ?? '-') . ' · import CSV',
                        ]);

                        Lote::create([
                            'producto_id'       => $d['producto']->id,
                            'compra_id'         => $compra->id,
                            'cantidad'          => $d['cantidad'],
                            'cantidad_restante' => $d['cantidad'],
                            'fecha_vencimiento' => $d['fecha_vencimiento'],
                        ]);
                    }

                    $creadas++;
                });
            } catch (\Throwable $e) {
                $errores[] = ['fila' => 'factura ' . ($grupo['factura'] ?? '?'), 'error' => $e->getMessage()];
            }
        }

        return response()->json([
            'compras_creadas' => $creadas,
            'omitidas'        => $omitidas,
            'errores'         => $errores,
            'total_grupos'    => count($grupos),
        ]);
    }
}
