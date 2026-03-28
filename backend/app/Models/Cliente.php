<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cliente extends Model
{
    protected $fillable = ['codigo', 'nombre', 'telefono', 'direccion', 'notas'];

    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class);
    }

    /** Genera el próximo código CLI-XXXX */
    public static function proximoCodigo(): string
    {
        $ultimo = self::orderByDesc('id')->value('codigo');
        if (!$ultimo) return 'CLI-0001';
        $n = (int) substr($ultimo, 4);
        return 'CLI-' . str_pad($n + 1, 4, '0', STR_PAD_LEFT);
    }
}
