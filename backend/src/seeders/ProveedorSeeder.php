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
                'nombre'   => 'Vittamax Nutrição Animal',
                'rut'      => null,
                'telefono' => '+55 11 9999-0001',
                'email'    => 'ventas@vittamax.com.br',
                'contacto' => 'Representante Brasil',
                'direccion'=> 'São Paulo, Brasil',
            ],
            [
                'nombre'   => 'Distribuidora Pet SRL',
                'rut'      => '30-12345678-9',
                'telefono' => '011 4523-7890',
                'email'    => 'pedidos@distpet.com.ar',
                'contacto' => 'Carlos Méndez',
                'direccion'=> 'Av. Corrientes 1234, CABA',
            ],
            [
                'nombre'   => 'Procon Nutrição Animal',
                'rut'      => null,
                'telefono' => '+55 21 9888-0002',
                'email'    => 'ventas@procon.com.br',
                'contacto' => 'João Costa',
                'direccion'=> 'Río de Janeiro, Brasil',
            ],
            [
                'nombre'   => 'Purina Argentina (Nestlé)',
                'rut'      => '30-50000123-4',
                'telefono' => '0800-888-7862',
                'email'    => 'atencion@purina.com.ar',
                'contacto' => 'Ejecutivo de cuentas',
                'direccion'=> 'Panamericana km 37, Pilar, Buenos Aires',
            ],
            [
                'nombre'   => 'Mars Argentina (Pedigree, Whiskas)',
                'rut'      => '30-60013624-1',
                'telefono' => '011 5555-8800',
                'email'    => 'ventas@mars.com.ar',
                'contacto' => 'Valeria Torres',
                'direccion'=> 'Panamericana km 42, Buenos Aires',
            ],
            [
                'nombre'   => 'Boehringer Ingelheim Animal Health',
                'rut'      => '30-70000456-7',
                'telefono' => '011 4341-1000',
                'email'    => 'vetanimal@boehringer.com.ar',
                'contacto' => 'Dra. Fernández',
                'direccion'=> 'Palermo, Buenos Aires',
            ],
            [
                'nombre'   => 'Vetinsumos SA',
                'rut'      => '30-88888001-2',
                'telefono' => '011 4600-2222',
                'email'    => 'ventas@vetinsumos.com.ar',
                'contacto' => 'Rodrigo Sosa',
                'direccion'=> 'Av. San Martín 560, CABA',
            ],
            [
                'nombre'   => 'Distribuidora Accesvet',
                'rut'      => '20-33456789-0',
                'telefono' => '011 4521-9988',
                'email'    => 'info@accesvet.com.ar',
                'contacto' => 'Patricia Gómez',
                'direccion'=> 'Flores, CABA',
            ],
            [
                'nombre'   => 'Agrosur Insumos',
                'rut'      => '30-44000321-6',
                'telefono' => '011 4789-3300',
                'email'    => 'compras@agrosur.com.ar',
                'contacto' => 'Eduardo Paez',
                'direccion'=> 'Ruta 8 km 45, Luján, Buenos Aires',
            ],
            [
                'nombre'   => 'Ri-Mar Alimentos Balanceados',
                'rut'      => '30-55000987-3',
                'telefono' => '011 4456-7700',
                'email'    => 'ventas@rimar.com.ar',
                'contacto' => 'Marcelo Ríos',
                'direccion'=> 'Mataderos, CABA',
            ],
            [
                'nombre'   => 'Biofresh Pet Food Brasil',
                'rut'      => null,
                'telefono' => '+55 41 9777-0003',
                'email'    => 'vendas@biofresh.com.br',
                'contacto' => 'Ana Paula',
                'direccion'=> 'Curitiba, Paraná, Brasil',
            ],
            [
                'nombre'   => 'Old Prince / Kongo (Vitalcan)',
                'rut'      => '30-66000234-5',
                'telefono' => '011 4333-5500',
                'email'    => 'ventas@vitalcan.com.ar',
                'contacto' => 'Miguel Ángel Ruiz',
                'direccion'=> 'Zona Norte, Buenos Aires',
            ],
        ];

        foreach ($proveedores as $p) {
            Proveedor::firstOrCreate(['nombre' => $p['nombre']], $p);
        }
    }
}
