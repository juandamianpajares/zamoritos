<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArqueoCaja extends Model
{
    protected $table = 'arqueos_caja';

    protected $fillable = [
        'fecha', 'denominaciones', 'fondo_cambio',
        'total_contado', 'total_esperado', 'diferencia', 'observacion',
    ];

    protected $casts = [
        'fecha'          => 'date:Y-m-d',
        'denominaciones' => 'array',
        'fondo_cambio'   => 'float',
        'total_contado'  => 'float',
        'total_esperado' => 'float',
        'diferencia'     => 'float',
    ];
}
