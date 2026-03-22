<?php

namespace Database\Seeders;

use App\Models\Categoria;
use Illuminate\Database\Seeder;

class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        // ── Categorías raíz ──────────────────────────────────────────────────
        $raices = [
            'LIMPIEZA', 'HIGIENE', 'ESTETICA', 'PASEO', 'ROPA',
            'COMEDEROS', 'VARIOS', 'ALIMENTOS', 'SNACK', 'VENENO',
        ];

        foreach ($raices as $nombre) {
            Categoria::firstOrCreate(['nombre' => $nombre, 'parent_id' => null]);
        }

        // ── Sub-categoría ANIMAL (hijos de raíces que aplican) ───────────────
        $animales = ['GATO', 'PERRO', 'CONEJO', 'AVES', 'PEZ', 'GENERICO'];
        $raicesConAnimal = ['ALIMENTOS', 'SNACK', 'HIGIENE', 'ESTETICA', 'PASEO', 'ROPA', 'COMEDEROS'];

        foreach ($raicesConAnimal as $nombreRaiz) {
            $raiz = Categoria::where('nombre', $nombreRaiz)->whereNull('parent_id')->first();
            if (!$raiz) continue;
            foreach ($animales as $animal) {
                Categoria::firstOrCreate(['nombre' => $animal, 'parent_id' => $raiz->id]);
            }
        }

        // ── ALIMENTOS/PERRO ─────────────────────────────────────────────────
        $alimentos   = Categoria::where('nombre', 'ALIMENTOS')->whereNull('parent_id')->first();
        $perroEnAlim = $alimentos ? Categoria::where('nombre', 'PERRO')->where('parent_id', $alimentos->id)->first() : null;

        if ($perroEnAlim) {
            foreach (['RAZA PEQUEÑA', 'RAZA MEDIANA', 'RAZA GRANDE', 'LIGHT', 'LIGHT RAZA PEQUEÑA', 'SENIOR'] as $sub) {
                Categoria::firstOrCreate(['nombre' => $sub, 'parent_id' => $perroEnAlim->id]);
            }
            $tamano = Categoria::firstOrCreate(['nombre' => 'TAMAÑO', 'parent_id' => $perroEnAlim->id]);
            foreach (['CACHORRO', 'RAZA PEQUEÑA', 'RAZA MEDIANA', 'RAZA GRANDE'] as $sub) {
                Categoria::firstOrCreate(['nombre' => $sub, 'parent_id' => $tamano->id]);
            }
        }

        // ── ALIMENTOS/GATO ──────────────────────────────────────────────────
        $gatoEnAlim = $alimentos ? Categoria::where('nombre', 'GATO')->where('parent_id', $alimentos->id)->first() : null;

        if ($gatoEnAlim) {
            foreach (['BEBE', 'ADULTO'] as $sub) {
                Categoria::firstOrCreate(['nombre' => $sub, 'parent_id' => $gatoEnAlim->id]);
            }
            $tipo = Categoria::firstOrCreate(['nombre' => 'TIPO', 'parent_id' => $gatoEnAlim->id]);
            foreach (['CASTRADO', 'URINARY'] as $sub) {
                Categoria::firstOrCreate(['nombre' => $sub, 'parent_id' => $tipo->id]);
            }
        }

        // ── ALIMENTOS/AVES ──────────────────────────────────────────────────
        $avesEnAlim = $alimentos ? Categoria::where('nombre', 'AVES')->where('parent_id', $alimentos->id)->first() : null;

        if ($avesEnAlim) {
            foreach (['POLLITO BEBE', 'ENGORDE', 'PONEDORA', 'MIX', 'CRECIMIENTO',
                      'MAIZ QUEBRADO', 'MAIZ ENTERO', 'MONTE', 'ALPISTE', 'TRIGO'] as $sub) {
                Categoria::firstOrCreate(['nombre' => $sub, 'parent_id' => $avesEnAlim->id]);
            }
        }
    }
}
