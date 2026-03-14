<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    use HasFactory;

    protected $fillable = [
        'codigo_barras', 'nombre', 'marca', 'categoria_id',
        'peso', 'unidad_medida', 'precio_venta', 'stock', 'activo',
        'fraccionado_de', 'en_promo', 'precio_promo',
    ];

    protected $casts = [
        'precio_venta' => 'float',
        'stock'        => 'float',
        'peso'         => 'float',
        'activo'       => 'boolean',
        'en_promo'     => 'boolean',
        'precio_promo' => 'float',
    ];

    public function fraccionadoDe(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'fraccionado_de');
    }

    public function fraccionados(): HasMany
    {
        return $this->hasMany(Producto::class, 'fraccionado_de');
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoStock::class);
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(Lote::class);
    }

    public function detalleCompras(): HasMany
    {
        return $this->hasMany(DetalleCompra::class);
    }
}
