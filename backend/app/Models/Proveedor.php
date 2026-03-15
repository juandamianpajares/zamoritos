<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Proveedor extends Model
{
    use HasFactory;

    protected $table = 'proveedores';

    protected $fillable = [
        'nombre', 'rut', 'telefono', 'email', 'direccion', 'contacto', 'notas', 'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function compras(): HasMany
    {
        return $this->hasMany(Compra::class);
    }
}
