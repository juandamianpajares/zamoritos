<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetalleCompra extends Model
{
    use HasFactory;

    protected $fillable = ['compra_id', 'producto_id', 'cantidad', 'precio_compra', 'subtotal'];

    protected $casts = [
        'cantidad'      => 'float',
        'precio_compra' => 'float',
        'subtotal'      => 'float',
    ];

    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class);
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }
}
