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
            CompraSeeder::class,      // 4. Compras → agrega stock + lotes + movimientos
            VentaSeeder::class,       // 5. Ventas → descuenta stock + movimientos
        ]);
    }
}
