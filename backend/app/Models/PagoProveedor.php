<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PagoProveedor extends Model
{
    protected $table = 'pagos_proveedores';

    protected $fillable = [
        'proveedor_id',
        'compra_id',
        'tipo',
        'monto',
        'fecha',
        'medio_pago',
        'referencia',
        'nota',
        'usuario',
    ];

    protected $casts = [
        'monto' => 'float',
        'fecha' => 'date',
    ];

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class);
    }

    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class);
    }
}
