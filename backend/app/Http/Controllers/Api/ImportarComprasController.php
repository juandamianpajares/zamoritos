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
 * Importa compras desde CSV con lógica de reconciliación.
 *
 * Columnas (separador ; o ,):
 *   factura ; fecha ; rut ; codigo_barras ; cantidad ; precio_compra ; fecha_vencimiento
 *
 * Reglas de deduplicación:
 *  - Se recorre todo el archivo primero; si el mismo codigo_barras aparece varias veces
 *    se conserva SOLO la última ocurrencia (last-wins).
 *
 * Reglas por cantidad:
 *  - cantidad = 0  → desestimar (no se crea detalle, no se toca precio ni stock)
 *  - cantidad = 1  → actualizar precio_compra del producto; se registra el detalle pero
 *                    NO se incrementa stock ni se crea MovimientoStock / Lote
 *  - cantidad > 1  → actualizar precio_compra + incrementar stock + MovimientoStock + Lote
 *
 * Todas las Compra generadas: tipo_pago='contado', estado_pago='pagado', dias_plazo=0.
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

        // ── Paso 1: leer todas las filas; deduplicar por codigo_barras (last-wins) ──
        $porCodigo = [];   // codigo_barras → ['data' => $data, 'fila' => $n]
        $fila      = 1;

        while (($row = fgetcsv($handle, 0, $sep)) !== false) {
            $fila++;
            if (count(array_filter($row, fn($v) => trim($v) !== '')) === 0) continue;
            if (count($row) < count($cabecera)) $row = array_pad($row, count($cabecera), '');
            $data   = array_combine($cabecera, array_map('trim', $row));
            $codigo = $data['codigo_barras'] ?? '';
            if ($codigo === '') continue;

            $porCodigo[$codigo] = ['data' => $data, 'fila' => $fila];
        }
        fclose($handle);

        // ── Paso 2: agrupar las filas deduplicadas por factura ──
        $grupos    = [];
        $sinFacIdx = 0;

        foreach ($porCodigo as $codigo => $entry) {
            $data       = $entry['data'];
            $facturaRaw = $data['factura'] ?? '';
            $key        = $facturaRaw !== '' ? $facturaRaw : ('__sin_' . (++$sinFacIdx));

            if (!isset($grupos[$key])) {
                $grupos[$key] = [
                    'factura' => $facturaRaw ?: null,
                    'fecha'   => $data['fecha'] ?? date('Y-m-d'),
                    'rut'     => $data['rut'] ?? '',
                    'filas'   => [],
                ];
            }
            $grupos[$key]['filas'][] = $entry;
        }

        // Caches
        $provCache     = Proveedor::all()->keyBy('rut');
        $prodPorCodigo = Producto::with('comboItems')->whereNotNull('codigo_barras')->get()->keyBy('codigo_barras');

        $creadas       = 0;
        $omitidas      = 0;
        $desestimados  = 0;
        $errores       = [];

        // ── Paso 3: procesar cada grupo ──
        foreach ($grupos as $grupo) {
            // Idempotente: si la factura ya existe → omitir
            if ($grupo['factura'] && Compra::where('factura', $grupo['factura'])->exists()) {
                $omitidas++;
                continue;
            }

            // Resolver proveedor por RUT
            $rut         = trim($grupo['rut']);
            $proveedor   = $rut ? $provCache->get($rut) : null;
            $proveedorId = $proveedor?->id;

            // Calcular fecha
            try {
                $fecha = (new \DateTime($grupo['fecha']))->format('Y-m-d');
            } catch (\Throwable) {
                $fecha = date('Y-m-d');
            }

            // Validar y clasificar detalles
            $detalles = [];
            foreach ($grupo['filas'] as ['data' => $data, 'fila' => $nFila]) {
                $codigo   = $data['codigo_barras'] ?? '';
                $cantidad = (float) str_replace(',', '.', $data['cantidad'] ?? '0');
                $precio   = (float) str_replace(['.', ','], ['', '.'], $data['precio_compra'] ?? '0');

                if (!isset($prodPorCodigo[$codigo])) {
                    $errores[] = ['fila' => $nFila, 'error' => "Código no encontrado: '{$codigo}'"];
                    continue;
                }
                if ($cantidad < 0) {
                    $errores[] = ['fila' => $nFila, 'error' => "Cantidad negativa en fila {$nFila}"];
                    continue;
                }

                $detalles[] = [
                    'producto'          => $prodPorCodigo[$codigo],
                    'cantidad'          => $cantidad,
                    'precio_compra'     => $precio,
                    'fecha_vencimiento' => ($data['fecha_vencimiento'] ?? '') ?: null,
                    'fila'              => $nFila,
                ];
            }

            // Separar activos (cantidad >= 1) de desestimados (cantidad == 0)
            $activos      = array_filter($detalles, fn($d) => $d['cantidad'] >= 1);
            $desestimados += count(array_filter($detalles, fn($d) => $d['cantidad'] == 0));

            if (empty($activos)) continue;

            try {
                DB::transaction(function () use ($grupo, $proveedorId, $fecha, $activos, &$creadas) {
                    // El total solo cuenta filas con cantidad > 1 (las de solo precio no mueven caja)
                    $total = collect($activos)->sum(fn($d) => $d['cantidad'] * $d['precio_compra']);

                    $compra = Compra::create([
                        'proveedor_id' => $proveedorId,
                        'fecha'        => $fecha,
                        'factura'      => $grupo['factura'],
                        'total'        => $total,
                        'tipo_pago'    => 'contado',
                        'dias_plazo'   => 0,
                        'estado_pago'  => 'pagado',
                        'monto_pagado' => $total,
                        'nota'         => 'Importado por CSV (reconciliación)',
                    ]);

                    foreach ($activos as $d) {
                        $subtotal = $d['cantidad'] * $d['precio_compra'];

                        DetalleCompra::create([
                            'compra_id'     => $compra->id,
                            'producto_id'   => $d['producto']->id,
                            'cantidad'      => $d['cantidad'],
                            'precio_compra' => $d['precio_compra'],
                            'subtotal'      => $subtotal,
                        ]);

                        // Siempre actualizar precio de compra
                        $d['producto']->update(['precio_compra' => $d['precio_compra']]);

                        if ($d['cantidad'] > 1) {
                            $producto  = $d['producto'];
                            $factura   = $grupo['factura'] ?? '-';
                            $fechaVenc = $d['fecha_vencimiento'];

                            $esPromo = $producto->en_promo > 0 && $producto->comboItems->isNotEmpty();

                            if ($esPromo) {
                                // Promo: distribuir stock a los componentes
                                foreach ($producto->comboItems as $item) {
                                    // Obtener el componente del cache si existe, o consultar
                                    $componente = $prodPorCodigo->firstWhere('id', $item->componente_producto_id)
                                        ?? Producto::find($item->componente_producto_id);
                                    if (!$componente) continue;

                                    $qtdComp = $item->cantidad * $d['cantidad'];
                                    $componente->increment('stock', $qtdComp);

                                    MovimientoStock::create([
                                        'producto_id' => $componente->id,
                                        'tipo'        => 'ingreso',
                                        'cantidad'    => $qtdComp,
                                        'referencia'  => 'compra #' . $compra->id . ' (promo «' . $producto->nombre . '»)',
                                        'observacion' => 'Factura: ' . $factura . ' · import CSV',
                                    ]);

                                    Lote::create([
                                        'producto_id'       => $componente->id,
                                        'compra_id'         => $compra->id,
                                        'cantidad'          => $qtdComp,
                                        'cantidad_restante' => $qtdComp,
                                        'fecha_vencimiento' => $fechaVenc,
                                    ]);
                                }
                            } else {
                                // Producto individual
                                $producto->increment('stock', $d['cantidad']);

                                MovimientoStock::create([
                                    'producto_id' => $producto->id,
                                    'tipo'        => 'ingreso',
                                    'cantidad'    => $d['cantidad'],
                                    'referencia'  => 'compra #' . $compra->id,
                                    'observacion' => 'Factura: ' . $factura . ' · import CSV',
                                ]);

                                Lote::create([
                                    'producto_id'       => $producto->id,
                                    'compra_id'         => $compra->id,
                                    'cantidad'          => $d['cantidad'],
                                    'cantidad_restante' => $d['cantidad'],
                                    'fecha_vencimiento' => $fechaVenc,
                                ]);
                            }
                        }
                        // cantidad == 1: solo precio_compra actualizado, sin movimiento de stock
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
            'desestimados'    => $desestimados,
            'errores'         => $errores,
            'total_codigos'   => count($porCodigo),
        ]);
    }
}
