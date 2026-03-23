<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Categoria extends Model
{
    use HasFactory;

    protected $fillable = ['nombre', 'parent_id', 'foto'];

    protected $appends = ['foto_url'];

    public function getFotoUrlAttribute(): ?string
    {
        if (empty($this->attributes['foto'])) return null;
        return Storage::disk('public')->url($this->attributes['foto']);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Categoria::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Categoria::class, 'parent_id')->with('children');
    }

    public function productos(): HasMany
    {
        return $this->hasMany(Producto::class);
    }
}
