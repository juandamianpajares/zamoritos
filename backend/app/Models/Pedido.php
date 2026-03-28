<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    protected $fillable = [
        'numero', 'cliente_id', 'estado',
        'costo_envio', 'medio_pago', 'notas', 'fecha',
    ];

    protected $casts = [
        'fecha'       => 'date',
        'costo_envio' => 'float',
    ];

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetallePedido::class);
    }

    /** Genera el próximo número PED-XXXX */
    public static function proximoNumero(): string
    {
        $ultimo = self::orderByDesc('id')->value('numero');
        if (!$ultimo) return 'PED-0001';
        $n = (int) substr($ultimo, 4);
        return 'PED-' . str_pad($n + 1, 4, '0', STR_PAD_LEFT);
    }

    public function getTotalAttribute(): float
    {
        return round($this->detalles->sum('subtotal') + $this->costo_envio, 2);
    }
}
