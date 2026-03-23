<?php

namespace Database\Seeders;

use App\Models\Categoria;
use Illuminate\Database\Seeder;

class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        // [nombre, parent_nombre|null]
        $tree = [
            // ── Raíces ────────────────────────────────────────────────────────
            ['LIMPIEZA',          null],
            ['HIGENE',            null],
            ['ESTETICA',          null],
            ['PASEO',             null],
            ['ROPA',              null],
            ['COMEDEROS',         null],
            ['VARIOS',            null],
            ['ALIMENTOS',         null],
            ['SNACK',             null],
            ['JUGETE',            null],
            ['VENENO',            null],
            ['COMBO',             null],
            ['OFERTA',            null],

            // ── ALIMENTOS ─────────────────────────────────────────────────────
            ['GATO',              'ALIMENTOS'],
            ['PERRO',             'ALIMENTOS'],
            ['CONEJO',            'ALIMENTOS'],
            ['AVES',              'ALIMENTOS'],
            ['PEZ',               'ALIMENTOS'],
            ['GENERICO',          'ALIMENTOS'],

            // ── ALIMENTOS > PERRO ─────────────────────────────────────────────
            ['ADULTO',            'PERRO'],
            ['RAZA PEQUEÑA',      'PERRO'],
            ['RAZA MEDIANA',      'PERRO'],
            ['RAZA GRANDE',       'PERRO'],
            ['LIGHT',             'PERRO'],
            ['LIGHT RAZA PEQUEÑA','PERRO'],
            ['SENIOR',            'PERRO'],
            ['CACHORRO',          'PERRO'],

            // ── ALIMENTOS > GATO ──────────────────────────────────────────────
            ['BEBE',              'GATO'],
            ['ADULTO',            'GATO'],
            ['CASTRADO',          'GATO'],
            ['URINARY',           'GATO'],

            // ── ALIMENTOS > AVES ──────────────────────────────────────────────
            ['POLLITO BEBE',      'AVES'],
            ['ENGORDE',           'AVES'],
            ['PONEDORA',          'AVES'],
            ['MIX',               'AVES'],
            ['CRECIMIENTO',       'AVES'],
            ['MAIZ QUEBRADO',     'AVES'],
            ['MAIZ ENTERO',       'AVES'],
            ['MONTE',             'AVES'],
            ['ALPISTE',           'AVES'],
            ['TRIGO',             'AVES'],
        ];

        // Cache de IDs por nombre para resolver parent_id
        $cache = [];

        foreach ($tree as [$nombre, $parentNombre]) {
            $parentId = $parentNombre ? ($cache[$parentNombre] ?? null) : null;

            $cat = Categoria::firstOrCreate(
                ['nombre' => $nombre, 'parent_id' => $parentId]
            );

            // Solo guardamos en cache la primera vez que aparece el nombre
            // (para que PERRO apunte a ALIMENTOS>PERRO, no a otra raíz)
            $cache[$nombre] ??= $cat->id;
        }
    }
}
