<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Compra extends Model
{
    use HasFactory;

    protected $fillable = [
        'fecha', 'proveedor_id', 'factura', 'total', 'usuario', 'nota',
        'tipo_pago', 'dias_plazo', 'fecha_vencimiento', 'estado_pago', 'monto_pagado',
    ];

    protected $casts = [
        'fecha'            => 'datetime',
        'fecha_vencimiento'=> 'date',
        'total'            => 'float',
        'monto_pagado'     => 'float',
        'dias_plazo'       => 'integer',
    ];

    /** Saldo pendiente de pago. */
    public function getSaldoAttribute(): float
    {
        return round($this->total - $this->monto_pagado, 2);
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class);
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetalleCompra::class);
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(Lote::class);
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(PagoProveedor::class);
    }
}
