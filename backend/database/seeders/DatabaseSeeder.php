<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CategoriaSeeder::class,          // 1. Categorías (con jerarquía)
            MarcaSeeder::class,              // 2. Marcas
            ProveedorSeeder::class,          // 3. Proveedores
            ProductoSeeder::class,           // 3. Productos principales con precios y combos
            PromoSeeder::class,              // 4. Vincula combos cruzados (promo_producto_id)
            ZamoritorsCatalogoSeeder::class, // 5. Catálogo completo 2026 (precio_venta=0 a actualizar)
            CompraSeeder::class,             // 6. Compras → agrega stock + lotes + movimientos
            VentaSeeder::class,              // 7. Ventas → descuenta stock + movimientos
        ]);
    }
}
