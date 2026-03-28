<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venta extends Model
{
    protected $fillable = [
        'fecha', 'tipo_pago', 'medio_pago', 'medios_pago',
        'receptor_nombre', 'receptor_rut', 'moneda',
        'subtotal', 'descuento', 'costo_envio', 'total',
        'estado', 'tipo_comprobante', 'numero_factura', 'kitfe_id',
        'usuario', 'observacion',
    ];

    protected $casts = [
        'fecha'       => 'datetime',
        'subtotal'    => 'float',
        'descuento'   => 'float',
        'total'       => 'float',
        'medios_pago' => 'array',
    ];

    public function detalles(): HasMany
    {
        return $this->hasMany(DetalleVenta::class);
    }

    /**
     * Kitfe v2: exportar como e-Ticket / e-Factura.
     * Implementar KitfeAdapter::export($this) cuando esté disponible.
     */
    public function isKitefSynced(): bool
    {
        return $this->kitfe_id !== null;
    }
}
