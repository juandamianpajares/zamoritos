<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetallePedido extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'pedido_id', 'producto_id', 'nombre_producto',
        'cantidad', 'precio_unitario', 'subtotal',
    ];

    protected $casts = [
        'cantidad'       => 'float',
        'precio_unitario'=> 'float',
        'subtotal'       => 'float',
    ];

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }
}
