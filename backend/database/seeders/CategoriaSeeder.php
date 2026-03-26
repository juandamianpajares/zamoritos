<?php

namespace Database\Seeders;

use App\Models\Categoria;
use Illuminate\Database\Seeder;

/**
 * Diccionario de categorías con descripción y tags.
 *
 * Tags disponibles:
 *   Animales : perro | gato | ave | granja | conejo | pez
 *   Especial : todos  (aplica a todas las especies)
 *   Tipo     : alimento | higiene | accesorio | sanitario | medicamento | parasitos | hogar | paseo
 *
 * Uso en filtros del POS:
 *   🐶 Perro  → tags contiene 'perro'
 *   🐱 Gato   → tags contiene 'gato'
 *   🐾 Resto  → tags contiene 'ave' | 'granja' | 'conejo' | 'pez'
 *   (categorías con 'todos' aparecen en la vista general, no en filtros de especie)
 */
class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            [
                'nombre'      => 'Alimento Perros',
                'descripcion' => 'Alimentos secos y balanceados para perros de todas las razas y etapas de vida.',
                'tags'        => ['perro', 'alimento'],
            ],
            [
                'nombre'      => 'Alimento Gatos',
                'descripcion' => 'Alimentos secos y balanceados para gatos de interior y exterior.',
                'tags'        => ['gato', 'alimento'],
            ],
            [
                'nombre'      => 'Alimento Húmedo y Snacks',
                'descripcion' => 'Latas, sobres, premios y snacks para perros y gatos.',
                'tags'        => ['perro', 'gato', 'alimento'],
            ],
            [
                'nombre'      => 'Alimento Aves y Granja',
                'descripcion' => 'Alimentos para aves domésticas, gallinas, patos y animales de granja.',
                'tags'        => ['ave', 'granja', 'alimento'],
            ],
            [
                'nombre'      => 'Antiparasitarios',
                'descripcion' => 'Antipulgas, antigarrapatas, desparasitantes internos y externos.',
                'tags'        => ['todos', 'parasitos'],
            ],
            [
                'nombre'      => 'Medicamentos',
                'descripcion' => 'Suplementos, vitaminas, antibióticos y medicamentos de uso veterinario.',
                'tags'        => ['todos', 'medicamento'],
            ],
            [
                'nombre'      => 'Arena Sanitaria',
                'descripcion' => 'Arenas aglomerantes, biodegradables y perfumadas para areneros de gatos.',
                'tags'        => ['gato', 'sanitario'],
            ],
            [
                'nombre'      => 'Bandejas y Accesorios Sanitarios',
                'descripcion' => 'Bandejas, puertas batientes y accesorios para el arenero del gato.',
                'tags'        => ['gato', 'sanitario'],
            ],
            [
                'nombre'      => 'Collares',
                'descripcion' => 'Collares de identificación, antipulgas y paseo para perros y gatos.',
                'tags'        => ['perro', 'gato', 'paseo'],
            ],
            [
                'nombre'      => 'Correas y Arneses',
                'descripcion' => 'Correas fijas, extensibles y arneses para el paseo del perro.',
                'tags'        => ['perro', 'paseo'],
            ],
            [
                'nombre'      => 'Juguetes',
                'descripcion' => 'Juguetes interactivos, pelotas y mordedores para perros y gatos.',
                'tags'        => ['perro', 'gato', 'accesorio'],
            ],
            [
                'nombre'      => 'Comederos y Bebederos',
                'descripcion' => 'Platos, comederos automáticos, fuentes y bebederos para mascotas.',
                'tags'        => ['todos', 'accesorio'],
            ],
            [
                'nombre'      => 'Higiene y Belleza',
                'descripcion' => 'Champús, acondicionadores, desodorizantes y artículos de higiene.',
                'tags'        => ['todos', 'higiene'],
            ],
            [
                'nombre'      => 'Ropa para Mascotas',
                'descripcion' => 'Ropa, abrigos, impermeables y disfraces para perros y gatos.',
                'tags'        => ['perro', 'gato', 'accesorio'],
            ],
            [
                'nombre'      => 'Camas y Descanso',
                'descripcion' => 'Camas, colchonetas, mantas y hamacas para el descanso de las mascotas.',
                'tags'        => ['perro', 'gato', 'accesorio'],
            ],
            [
                'nombre'      => 'Peines y Grooming',
                'descripcion' => 'Cepillos, peines, tijeras, maquinas de cortar y artículos de grooming profesional.',
                'tags'        => ['todos', 'higiene'],
            ],
            [
                'nombre'      => 'Artículos del Hogar y Jardín',
                'descripcion' => 'Productos de limpieza, ambientadores y artículos para el hogar y jardín.',
                'tags'        => ['todos', 'hogar'],
            ],
            [
                'nombre'      => 'Control de Plagas',
                'descripcion' => 'Raticidas, insecticidas, cebos y productos para el control de plagas del hogar.',
                'tags'        => ['todos', 'parasitos'],
            ],
            [
                'nombre'      => 'Transporte',
                'descripcion' => 'Bolsos, cajas de transporte, jaulas y transportadoras para mascotas.',
                'tags'        => ['todos', 'accesorio'],
            ],
            [
                'nombre'      => 'Rascadores',
                'descripcion' => 'Rascadores, postes sisal, torres y centros de actividad para gatos.',
                'tags'        => ['gato', 'accesorio'],
            ],
            [
                'nombre'      => 'Accesorios Varios',
                'descripcion' => 'Otros accesorios, artículos y novedades para mascotas.',
                'tags'        => ['todos', 'accesorio'],
            ],
        ];

        foreach ($categorias as $data) {
            $cat = Categoria::firstOrCreate(
                ['nombre' => $data['nombre']],
                ['descripcion' => $data['descripcion'], 'tags' => $data['tags']]
            );
            // Actualizar descripción y tags si ya existía
            if (!$cat->wasRecentlyCreated) {
                $cat->update([
                    'descripcion' => $data['descripcion'],
                    'tags'        => $data['tags'],
                ]);
            }
        }
    }
}
