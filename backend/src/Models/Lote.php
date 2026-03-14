<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lote extends Model
{
    use HasFactory;

    protected $fillable = [
        'producto_id', 'compra_id', 'fecha_ingreso',
        'fecha_vencimiento', 'cantidad', 'cantidad_restante',
    ];

    protected $casts = [
        'fecha_ingreso'     => 'datetime',
        'fecha_vencimiento' => 'date',
        'cantidad'          => 'float',
        'cantidad_restante' => 'float',
    ];

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class);
    }
}
