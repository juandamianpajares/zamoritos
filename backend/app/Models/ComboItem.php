<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComboItem extends Model
{
    protected $table = 'combo_items';

    protected $fillable = ['combo_producto_id', 'componente_producto_id', 'cantidad'];

    protected $casts = ['cantidad' => 'float'];

    public function componente(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'componente_producto_id');
    }

    public function combo(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'combo_producto_id');
    }
}
