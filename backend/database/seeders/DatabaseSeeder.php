<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CategoriaSeeder::class,         // 1. Categorías (jerarquía completa)
            MarcaSeeder::class,             // 2. Marcas
            ProveedorSeeder::class,         // 3. Proveedores con RUT y contacto
            //ProductoSeeder::class,          // 4. Catálogo base ALIMENTOS + combos
            //PromoSeeder::class,             // 5. Promos sobre combos
            //ZamoritorsCatalogoSeeder::class,// 6. Catálogo extendido (stock = 0)
            // CompraSeeder → NO: stock se carga vía compras reales en la UI
            // VentaSeeder  → NO: ventas son datos operativos reales
        ]);
    }
}
