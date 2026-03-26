<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Categoria extends Model
{
    use HasFactory;

    protected $fillable = ['nombre', 'descripcion', 'tags', 'parent_id'];

    protected $casts = [
        'tags' => 'array',
    ];

    public function productos(): HasMany
    {
        return $this->hasMany(Producto::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Categoria::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Categoria::class, 'parent_id');
    }
}
