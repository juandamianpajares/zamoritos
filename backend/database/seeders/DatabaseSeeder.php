<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CategoriaSeeder::class,   // 1. Categorías
            ProveedorSeeder::class,   // 2. Proveedores
            ProductoSeeder::class,    // 3. Productos (sin stock, o con stock inicial)
            PromoSeeder::class,       // 4. Vincula combos cruzados (promo_producto_id)
            CompraSeeder::class,      // 5. Compras → agrega stock + lotes + movimientos
            VentaSeeder::class,       // 6. Ventas → descuenta stock + movimientos
        ]);
    }
}
