<?php

namespace App\Services;

use App\Models\ComboItem;
use App\Models\DetalleVenta;
use App\Models\MovimientoStock;
use App\Models\Producto;
use App\Models\Venta;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Service Layer: encapsula toda la lógica de negocio de ventas.
 *
 * Puntos de extensión futuros:
 *  - KitfeAdapter::export($venta)  → emisión de e-Ticket / e-Factura en Kitfe
 *  - FifoLoteDeductor::deduct()    → descuento FIFO por lotes con vencimiento
 *  - VentaCreatedEvent             → notificaciones, analytics, etc.
 */
class VentaService
{
    /**
     * Registra una venta, descuenta stock y genera movimientos.
     *
     * @param  array{
     *   fecha: string,
     *   tipo_pago: string,
     *   medio_pago: ?string,
     *   receptor_nombre: ?string,
     *   usuario: ?string,
     *   observacion: ?string,
     *   detalles: array<array{producto_id: int, cantidad: float, precio_unitario: float}>
     * } $data
     */
    public function registrar(array $data): Venta
    {
        return DB::transaction(function () use ($data) {
            $this->validarStock($data['detalles']);

            $subtotal = collect($data['detalles'])
                ->sum(fn($d) => $d['cantidad'] * $d['precio_unitario']);

            // Pago combinado: derivar medio_pago legible de la lista
            $mediosPago = $data['medios_pago'] ?? null;
            if ($mediosPago) {
                $medioPago = collect($mediosPago)->pluck('medio')->join(', ');
            } else {
                $medioPago = $data['medio_pago'] ?? null;
            }

            $venta = Venta::create([
                'fecha'           => $data['fecha'],
                'tipo_pago'       => $data['tipo_pago'],
                'medio_pago'      => $medioPago,
                'medios_pago'     => $mediosPago,
                'receptor_nombre' => $data['receptor_nombre'] ?? null,
                'moneda'          => 'UYU',
                'subtotal'        => $subtotal,
                'descuento'       => 0,
                'total'           => $subtotal,
                'estado'          => 'confirmada',
                'numero_factura'  => $data['numero_factura'] ?? null,
                'usuario'         => $data['usuario'] ?? null,
                'observacion'     => $data['observacion'] ?? null,
            ]);

            foreach ($data['detalles'] as $d) {
                $subtotalLinea = $d['cantidad'] * $d['precio_unitario'];

                DetalleVenta::create([
                    'venta_id'        => $venta->id,
                    'producto_id'     => $d['producto_id'],
                    'cantidad'        => $d['cantidad'],
                    'precio_unitario' => $d['precio_unitario'],
                    'descuento'       => 0,
                    'subtotal'        => $subtotalLinea,
                ]);

                $producto = Producto::with('comboItems')->findOrFail($d['producto_id']);

                $esPromoConComponentes = $producto->en_promo !== \App\Models\Producto::PROMO_NINGUNA
                    && $producto->comboItems->isNotEmpty();

                $esRegaloAjuste = $producto->en_promo === \App\Models\Producto::PROMO_REGALO
                    && $producto->comboItems->isEmpty();

                if ($esRegaloAjuste) {
                    // Producto ficticio de ajuste (ej: descuento, costo de envío): sin stock físico
                    continue;
                } elseif ($esPromoConComponentes) {
                    // COMBO u OFERTA: descontar stock de cada componente
                    foreach ($producto->comboItems as $item) {
                        $componente    = Producto::findOrFail($item->componente_producto_id);
                        $qtdComponente = $item->cantidad * $d['cantidad'];
                        $componente->decrement('stock', $qtdComponente);

                        MovimientoStock::create([
                            'producto_id' => $item->componente_producto_id,
                            'tipo'        => 'venta',
                            'cantidad'    => -$qtdComponente,
                            'referencia'  => 'venta #' . $venta->id . ' (promo «' . $producto->nombre . '»)',
                            'usuario'     => $data['usuario'] ?? null,
                        ]);
                    }
                    // El producto-promo es una pantalla, no tiene stock físico
                } else {
                    $producto->decrement('stock', $d['cantidad']);

                    MovimientoStock::create([
                        'producto_id' => $d['producto_id'],
                        'tipo'        => 'venta',
                        'cantidad'    => -$d['cantidad'],
                        'referencia'  => 'venta #' . $venta->id,
                        'usuario'     => $data['usuario'] ?? null,
                    ]);
                }
            }

            // TODO Kitfe v2: KitfeAdapter::export($venta)

            return $venta->load('detalles.producto');
        });
    }

    /**
     * Anula una venta: revierte stock y movimientos.
     */
    public function anular(Venta $venta): Venta
    {
        if ($venta->estado === 'anulada') {
            throw ValidationException::withMessages(['estado' => 'La venta ya está anulada.']);
        }

        return DB::transaction(function () use ($venta) {
            $venta->load('detalles');

            foreach ($venta->detalles as $d) {
                $producto = Producto::with('comboItems')->findOrFail($d->producto_id);

                $esPromoConComponentes = $producto->en_promo !== \App\Models\Producto::PROMO_NINGUNA
                    && $producto->comboItems->isNotEmpty();

                $esRegaloAjuste = $producto->en_promo === \App\Models\Producto::PROMO_REGALO
                    && $producto->comboItems->isEmpty();

                if ($esRegaloAjuste) {
                    // Sin stock físico — nada que revertir
                    continue;
                } elseif ($esPromoConComponentes) {
                    foreach ($producto->comboItems as $item) {
                        $componente    = Producto::findOrFail($item->componente_producto_id);
                        $qtdComponente = $item->cantidad * $d->cantidad;
                        $componente->increment('stock', $qtdComponente);

                        MovimientoStock::create([
                            'producto_id' => $item->componente_producto_id,
                            'tipo'        => 'ajuste',
                            'cantidad'    => $qtdComponente,
                            'referencia'  => 'anulación venta #' . $venta->id,
                            'observacion' => 'Venta anulada — promo «' . $producto->nombre . '»',
                        ]);
                    }
                } else {
                    $producto->increment('stock', $d->cantidad);

                    MovimientoStock::create([
                        'producto_id' => $d->producto_id,
                        'tipo'        => 'ajuste',
                        'cantidad'    => $d->cantidad,
                        'referencia'  => 'anulación venta #' . $venta->id,
                        'observacion' => 'Venta anulada',
                    ]);
                }
            }

            $venta->update(['estado' => 'anulada']);

            return $venta->fresh('detalles.producto');
        });
    }

    /** Verifica que haya stock suficiente para cada línea. */
    private function validarStock(array $detalles): void
    {
        $errors = [];

        foreach ($detalles as $d) {
            $producto = Producto::with('comboItems')->find($d['producto_id']);
            if (!$producto) continue;

            $esPromoConComponentes = $producto->en_promo !== \App\Models\Producto::PROMO_NINGUNA
                && $producto->comboItems->isNotEmpty();

            $esRegaloAjuste = $producto->en_promo === \App\Models\Producto::PROMO_REGALO
                && $producto->comboItems->isEmpty();

            if ($esRegaloAjuste) {
                continue;
            } elseif ($esPromoConComponentes) {
                foreach ($producto->comboItems as $item) {
                    $componente = Producto::find($item->componente_producto_id);
                    if (!$componente) continue;
                    $necesario = $item->cantidad * $d['cantidad'];
                    if ($componente->stock < $necesario) {
                        $errors["componente_{$item->componente_producto_id}"] =
                            "Stock insuficiente para «{$componente->nombre}» (necesario: {$necesario}, disponible: {$componente->stock}).";
                    }
                }
            } else {
                if ($producto->stock < $d['cantidad']) {
                    $errors["producto_{$d['producto_id']}"] =
                        "Stock insuficiente para «{$producto->nombre}» (disponible: {$producto->stock} {$producto->unidad_medida}).";
                }
            }
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }
}
