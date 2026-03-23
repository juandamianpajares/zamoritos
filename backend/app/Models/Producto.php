<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Facades\Storage;

class Producto extends Model
{
    use HasFactory;

    protected $fillable = [
        'codigo_barras', 'nombre', 'marca', 'marca_id', 'categoria_id',
        'peso', 'unidad_medida', 'precio_venta', 'precio_compra', 'stock', 'activo',
        'fraccionado_de', 'fraccionable', 'es_combo',
        'en_promo', 'precio_promo', 'promo_producto_id',
        'foto', 'thumb', 'foto_externa',
        'notificar_stock_bajo', 'destacado',
    ];

    protected $appends = ['foto_url', 'thumb_url'];

    protected $casts = [
        'precio_venta'        => 'integer',
        'precio_compra'       => 'float',
        'stock'               => 'float',
        'peso'                => 'float',
        'activo'              => 'boolean',
        'fraccionable'        => 'boolean',
        'es_combo'            => 'boolean',
        'en_promo'            => 'boolean',
        'precio_promo'        => 'integer',
        'notificar_stock_bajo'=> 'boolean',
        'destacado'           => 'boolean',
    ];

    /** URL pública de la foto principal (storage local o URL externa) */
    public function getFotoUrlAttribute(): ?string
    {
        if (!empty($this->attributes['foto_externa'])) return $this->attributes['foto_externa'];
        if (!empty($this->attributes['foto']))         return Storage::disk('public')->url($this->attributes['foto']);
        return null;
    }

    /** URL pública del thumbnail */
    public function getThumbUrlAttribute(): ?string
    {
        if (!empty($this->attributes['thumb'])) return Storage::disk('public')->url($this->attributes['thumb']);
        if (!empty($this->attributes['foto_externa'])) return $this->attributes['foto_externa'];
        return null;
    }

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

    public function marcaRel(): BelongsTo
    {
        return $this->belongsTo(Marca::class, 'marca_id');
    }

    /** Segundo producto del combo promocional */
    public function promoProducto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'promo_producto_id');
    }

    /** Componentes que forman este combo */
    public function comboItems(): HasMany
    {
        return $this->hasMany(ComboItem::class, 'combo_producto_id');
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
