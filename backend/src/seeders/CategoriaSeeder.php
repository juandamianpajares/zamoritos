<?php

namespace Database\Seeders;

use App\Models\Categoria;
use Illuminate\Database\Seeder;

class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            'Alimento Perros',
            'Alimento Gatos',
            'Alimento Húmedo y Snacks',
            'Alimento Aves y Granja',
            'Antiparasitarios',
            'Medicamentos',
            'Arena Sanitaria',
            'Bandejas y Accesorios Sanitarios',
            'Collares',
            'Correas y Arneses',
            'Juguetes',
            'Comederos y Bebederos',
            'Higiene y Belleza',
            'Ropa para Mascotas',
            'Camas y Descanso',
            'Peines y Grooming',
            'Artículos del Hogar y Jardín',
            'Control de Plagas',
            'Transporte',
            'Rascadores',
            'Accesorios Varios',
        ];

        foreach ($categorias as $nombre) {
            Categoria::firstOrCreate(['nombre' => $nombre]);
        }
    }
}
