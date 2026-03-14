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
                'nombre'   => 'Nutrapet',
                'rut'      => '214608160019',
                'telefono' => '095353092',
                'contacto' => 'Marcelo',
            ],
            [
                'nombre'   => 'Nestle Del Uruguay S.A.',
                'rut'      => '210000480010',
                'telefono' => '097759866',
                'contacto' => 'Nicolas',
            ],
            [
                'nombre'   => 'Sadenir S.A.',
                'rut'      => '215108900011',
                'telefono' => '092510302',
                'contacto' => 'Sara',
            ],
            [
                'nombre'   => 'Agrofeed',
                'rut'      => '216177480016',
                'telefono' => '095968309',
                'contacto' => 'Pablo',
            ],
            [
                'nombre'   => 'Remiplat',
                'rut'      => '215107690013',
                'telefono' => '099647109',
                'contacto' => 'Armando',
            ],
            [
                'nombre'   => 'Ri-mart',
                'rut'      => '214973250014',
                'telefono' => '092141357',
                'contacto' => 'Maxi',
            ],
            [
                'nombre'   => 'Pet Care Uruguay',
                'rut'      => '216740540016',
                'telefono' => '095933134',
                'contacto' => 'Silvana',
            ],
            [
                'nombre'   => 'TECNODOT S A',
                'rut'      => '216159010011',
                'telefono' => '095723555',
                'contacto' => 'Bruno',
            ],
            [
                'nombre'   => 'Cedrilco s.a.',
                'rut'      => '217300300015',
                'telefono' => '093485018',
                'contacto' => 'Los increibles',
            ],
            [
                'nombre'   => 'SERVIVET NUTRITION',
                'rut'      => '218734020010',
                'telefono' => '097969327',
                'contacto' => 'Javier',
            ],
        ];

        foreach ($proveedores as $p) {
            Proveedor::firstOrCreate(['rut' => $p['rut']], $p);
        }
    }
}
