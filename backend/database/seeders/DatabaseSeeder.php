<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CategoriaSeeder::class,  // 1. Categorías (con jerarquía)
            MarcaSeeder::class,      // 2. Marcas
            ProveedorSeeder::class,  // 3. Proveedores
            ProductoSeeder::class,   // 4. Catálogo ALIMENTOS + combos con combo_items
        ]);
    }
}
