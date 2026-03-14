<?php

namespace Database\Seeders;

use App\Models\Proveedor;
use Illuminate\Database\Seeder;

class ProveedorSeeder extends Seeder
{
    public function run(): void
    {
        $proveedores = [
            [
                'nombre'    => 'Distribuidora Pet Sur SRL',
                'rut'       => '30-12345678-9',
                'telefono'  => '099 111 222',
                'email'     => 'pedidos@petsur.com.uy',
                'contacto'  => 'Carlos Méndez',
                'direccion' => 'Av. 18 de Julio 1234, Montevideo',
            ],
            [
                'nombre'    => 'Granos del Norte SRL',
                'rut'       => '30-98765432-1',
                'telefono'  => '099 333 444',
                'email'     => 'ventas@granosdelnorte.com.uy',
                'contacto'  => 'Ana Rodríguez',
                'direccion' => 'Ruta 5 km 120, Rivera',
            ],
            [
                'nombre'    => 'Vittamax Nutrição Animal',
                'rut'       => null,
                'telefono'  => '+55 11 9999-0001',
                'email'     => 'ventas@vittamax.com.br',
                'contacto'  => 'João Costa',
                'direccion' => 'São Paulo, Brasil',
            ],
        ];

        foreach ($proveedores as $p) {
            Proveedor::firstOrCreate(['nombre' => $p['nombre']], $p);
        }
    }
}
