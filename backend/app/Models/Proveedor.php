<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Proveedor extends Model
{
    use HasFactory;

    protected $table = 'proveedores';

    protected $fillable = [
        'nombre', 'rut', 'telefono', 'email', 'direccion', 'contacto', 'notas', 'activo',
        'saldo_manual',
    ];

    protected $casts = [
        'activo'       => 'boolean',
        'saldo_manual' => 'float',
    ];

    protected $appends = ['saldo_compras', 'saldo_total'];

    /** Suma del saldo pendiente de todas las compras diferidas de este proveedor. */
    public function getSaldoComprasAttribute(): float
    {
        return (float) $this->compras()
            ->whereIn('estado_pago', ['pendiente', 'parcial'])
            ->selectRaw('SUM(total - monto_pagado) as saldo')
            ->value('saldo') ?? 0;
    }

    /** Deuda total: compras diferidas + saldo cargado manualmente. */
    public function getSaldoTotalAttribute(): float
    {
        return round($this->saldo_manual + $this->saldo_compras, 2);
    }

    public function compras(): HasMany
    {
        return $this->hasMany(Compra::class);
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(PagoProveedor::class);
    }
}
