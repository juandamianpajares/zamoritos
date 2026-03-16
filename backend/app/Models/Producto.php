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
        'peso', 'unidad_medida', 'precio_venta', 'precio_compra', 'stock', 'activo',
        'fraccionado_de', 'fraccionable',
        'en_promo', 'precio_promo', 'promo_producto_id',
        'foto', 'foto_url',
        'notificar_stock_bajo',
    ];

    protected $casts = [
        'precio_venta'        => 'integer',
        'precio_compra'       => 'integer',
        'stock'               => 'float',
        'peso'                => 'float',
        'activo'              => 'boolean',
        'fraccionable'        => 'boolean',
        'en_promo'            => 'boolean',
        'precio_promo'        => 'integer',
        'notificar_stock_bajo'=> 'boolean',
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

    /** Segundo producto del combo promocional */
    public function promoProducto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'promo_producto_id');
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
