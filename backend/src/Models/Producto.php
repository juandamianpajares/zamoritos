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
        'fraccionado_de', 'fraccionable', 'modo_fraccion',
        'en_promo', 'precio_promo', 'promo_producto_id',
        'foto', 'thumb', 'foto_externa',
        'notificar_stock_bajo', 'destacado',
    ];

    protected $appends = ['foto_url', 'thumb_url'];

    // en_promo: 0=sin promo | 1=COMBO | 2=OFERTA | 3=REGALO
    public const PROMO_NINGUNA = 0;
    public const PROMO_COMBO   = 1;
    public const PROMO_OFERTA  = 2;
    public const PROMO_REGALO  = 3;

    public const PROMO_LABELS = [
        self::PROMO_NINGUNA => null,
        self::PROMO_COMBO   => 'COMBO',
        self::PROMO_OFERTA  => 'OFERTA',
        self::PROMO_REGALO  => 'REGALO',
    ];

    protected $casts = [
        'precio_venta'        => 'integer',
        'precio_compra'       => 'integer',
        'stock'               => 'float',
        'peso'                => 'float',
        'activo'              => 'boolean',
        'fraccionable'        => 'boolean',
        'en_promo'            => 'integer',   // 0-3 (ver constantes PROMO_*)
        'precio_promo'        => 'integer',
        'notificar_stock_bajo'=> 'boolean',
        'destacado'           => 'boolean',
    ];

    /** URL pública de la foto principal — ruta relativa para evitar conflictos http/https */
    public function getFotoUrlAttribute(): ?string
    {
        if (!empty($this->attributes['foto_externa'])) return $this->attributes['foto_externa'];
        if (!empty($this->attributes['foto']))         return '/storage/' . $this->attributes['foto'];
        return null;
    }

    /** URL pública del thumbnail — ruta relativa */
    public function getThumbUrlAttribute(): ?string
    {
        if (!empty($this->attributes['thumb']))        return '/storage/' . $this->attributes['thumb'];
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
