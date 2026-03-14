<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Database\Seeder;

class ProductoSeeder extends Seeder
{
    public function run(): void
    {
        $cat = fn(string $nombre) => Categoria::where('nombre', $nombre)->value('id');

        // stock=0 → recibirá stock por CompraSeeder
        // stock>0 → producto con stock inicial (no tiene compra en el CSV)
        $productos = [
            // ── Productos requeridos por ventas.csv ──────────────────────────────
            ['codigo_barras' => '8445290068798', 'marca' => 'Cat Chow',   'nombre' => 'CAT CHOW Adultos Carne y Pollo 15kg',         'cat' => 'Alimento Gatos',         'peso' => 15.0,  'um' => 'kg',   'pv' => 4630,  'stock' => 0],
            ['codigo_barras' => '7730900660259', 'marca' => 'Realcan',    'nombre' => 'REALCAN Adultos 25kg',                         'cat' => 'Alimento Perros',        'peso' => 25.0,  'um' => 'kg',   'pv' => 2786,  'stock' => 0],
            ['codigo_barras' => '7730900660648', 'marca' => 'Realcan',    'nombre' => 'REALCAN Adulto 8kg',                           'cat' => 'Alimento Perros',        'peso' => 8.0,   'um' => 'kg',   'pv' => 1200,  'stock' => 5],
            ['codigo_barras' => '6970216830958', 'marca' => 'Cat Litter', 'nombre' => 'CAT LITTER Bentonita Lavanda 4kg',             'cat' => 'Arena Sanitaria',        'peso' => 4.0,   'um' => 'unid', 'pv' => 240,   'stock' => 5],
            ['codigo_barras' => '7898349703637', 'marca' => 'Monello',    'nombre' => 'MONELLO Cat Castrado 10.1kg',                  'cat' => 'Alimento Gatos',         'peso' => 10.1,  'um' => 'kg',   'pv' => 392,   'stock' => 0],
            ['codigo_barras' => '7730900660761', 'marca' => 'Fortachon',  'nombre' => 'FORTACHON Adulto 25kg',                        'cat' => 'Alimento Perros',        'peso' => 25.0,  'um' => 'kg',   'pv' => 1691,  'stock' => 0],
            ['codigo_barras' => '7898224825096', 'marca' => 'Vittamax',   'nombre' => 'VITTAMAX Natural Pequeño Porte 1kg',           'cat' => 'Alimento Perros',        'peso' => 1.0,   'um' => 'kg',   'pv' => 196,   'stock' => 0],
            ['codigo_barras' => '7898224823122', 'marca' => 'Vittamax',   'nombre' => 'VITTAMAX Gato Carne 23+2kg',                   'cat' => 'Alimento Gatos',         'peso' => 23.0,  'um' => 'kg',   'pv' => 185,   'stock' => 0],
            ['codigo_barras' => '7896588948253', 'marca' => 'Equilibrio', 'nombre' => 'EQUILIBRIO Filhote 15+3kg',                    'cat' => 'Alimento Perros',        'peso' => 15.0,  'um' => 'kg',   'pv' => 672,   'stock' => 0],
            ['codigo_barras' => '7896588948246', 'marca' => 'Equilibrio', 'nombre' => 'EQUILIBRIO Adult All Breeds Active 15+3kg',    'cat' => 'Alimento Perros',        'peso' => 15.0,  'um' => 'kg',   'pv' => 287,   'stock' => 0],
            ['codigo_barras' => 'RAC004',        'marca' => 'Raval',      'nombre' => 'RAVAL Ponedora 25kg',                          'cat' => 'Alimento Aves y Granja', 'peso' => 25.0,  'um' => 'kg',   'pv' => 35,    'stock' => 25],
            ['codigo_barras' => 'RAC016',        'marca' => 'Raval',      'nombre' => 'RAVAL Iniciación Ponedoras 25kg',              'cat' => 'Alimento Aves y Granja', 'peso' => 25.0,  'um' => 'kg',   'pv' => 95,    'stock' => 0],
            ['codigo_barras' => '7730906561017', 'marca' => 'Keller',     'nombre' => 'KELLER Adulto 7kg',                            'cat' => 'Alimento Perros',        'peso' => 7.0,   'um' => 'kg',   'pv' => 116,   'stock' => 0],
            ['codigo_barras' => '7730944740276', 'marca' => 'Criolla',    'nombre' => 'CRIOLLA Gato 7kg',                             'cat' => 'Alimento Gatos',         'peso' => 7.0,   'um' => 'kg',   'pv' => 960,   'stock' => 0],
            ['codigo_barras' => 'RAC019',        'marca' => 'Ri-Mar',     'nombre' => 'RI-MAR Maragata Mix 25kg',                     'cat' => 'Alimento Aves y Granja', 'peso' => 25.0,  'um' => 'kg',   'pv' => 200,   'stock' => 10],
            ['codigo_barras' => 'ND14228',       'marca' => 'Natural Dog','nombre' => 'NATURAL DOG Adulto 7kg',                       'cat' => 'Alimento Perros',        'peso' => 7.0,   'um' => 'kg',   'pv' => 1156,  'stock' => 0],
            ['codigo_barras' => '7730918030846', 'marca' => 'Connie',     'nombre' => 'CONNIE Gato Peixe 8kg',                        'cat' => 'Alimento Gatos',         'peso' => 8.0,   'um' => 'kg',   'pv' => 1204,  'stock' => 0],
            ['codigo_barras' => 'RAC023',        'marca' => 'Ri-Mar',     'nombre' => 'RI-MAR Maíz Especial Entero 25kg',             'cat' => 'Alimento Aves y Granja', 'peso' => 25.0,  'um' => 'kg',   'pv' => 189,   'stock' => 0],
            ['codigo_barras' => '7730906560942', 'marca' => 'Rex',        'nombre' => 'REX Adulto 25kg',                              'cat' => 'Alimento Perros',        'peso' => 25.0,  'um' => 'kg',   'pv' => 84,    'stock' => 0],
            ['codigo_barras' => '7896588939138', 'marca' => 'Equilibrio', 'nombre' => 'EQUILIBRIO Gatito Bebé 7.5kg',                 'cat' => 'Alimento Gatos',         'peso' => 7.5,   'um' => 'kg',   'pv' => 170,   'stock' => 0],
            ['codigo_barras' => '7898363312716', 'marca' => 'Magnus',     'nombre' => 'MAGNUS Galletas Original 400g',                'cat' => 'Alimento Húmedo y Snacks','peso' => 0.4,  'um' => 'unid', 'pv' => 28,    'stock' => 0],
            ['codigo_barras' => '7898939952957', 'marca' => 'Matisse',    'nombre' => 'MATISSE Castrados Cordero 7.5kg',              'cat' => 'Alimento Gatos',         'peso' => 7.5,   'um' => 'kg',   'pv' => 910,   'stock' => 0],
            ['codigo_barras' => '675',           'marca' => 'Cat Litter', 'nombre' => 'CAT LITTER Sin Aroma 8kg',                     'cat' => 'Arena Sanitaria',        'peso' => 8.0,   'um' => 'unid', 'pv' => 613,   'stock' => 0],
            ['codigo_barras' => '7730918031102', 'marca' => 'Connie',     'nombre' => 'CONNIE Perro 22+3kg',                          'cat' => 'Alimento Perros',        'peso' => 22.0,  'um' => 'kg',   'pv' => 2310,  'stock' => 0],
            ['codigo_barras' => 'RAC003',        'marca' => 'San José',   'nombre' => 'SAN JOSE Conejo 25kg',                         'cat' => 'Alimento Aves y Granja', 'peso' => 25.0,  'um' => 'kg',   'pv' => 200,   'stock' => 25],
            ['codigo_barras' => 'RAC024',        'marca' => 'Ri-Mar',     'nombre' => 'RI-MAR Maíz Quebrado 25kg',                    'cat' => 'Alimento Aves y Granja', 'peso' => 25.0,  'um' => 'kg',   'pv' => 78,    'stock' => 0],
            ['codigo_barras' => '7898510459080', 'marca' => 'Primogato',  'nombre' => 'PRIMOGATO Premium Castrado 15kg',              'cat' => 'Alimento Gatos',         'peso' => 15.0,  'um' => 'kg',   'pv' => 287,   'stock' => 0],
            ['codigo_barras' => '7896588952106', 'marca' => 'Equilibrio', 'nombre' => 'EQUILIBRIO Cat 7.5+750g',                      'cat' => 'Alimento Gatos',         'peso' => 7.5,   'um' => 'kg',   'pv' => 434,   'stock' => 0],
            ['codigo_barras' => '7896803080102', 'marca' => 'Astro',      'nombre' => 'ASTRO Selection Adulto 14+3kg',                'cat' => 'Alimento Perros',        'peso' => 14.0,  'um' => 'kg',   'pv' => 3067,  'stock' => 0],
            ['codigo_barras' => '7898349701442', 'marca' => 'Monello',    'nombre' => 'MONELLO Diversão 300g',                        'cat' => 'Alimento Húmedo y Snacks','peso' => 0.3,  'um' => 'unid', 'pv' => 180,   'stock' => 10],
            ['codigo_barras' => '6970216830620', 'marca' => 'Cat Litter', 'nombre' => 'CAT LITTER Bentonita Rosas 4kg',               'cat' => 'Arena Sanitaria',        'peso' => 4.0,   'um' => 'unid', 'pv' => 480,   'stock' => 5],
            ['codigo_barras' => '7898224827021', 'marca' => 'Vittamax',   'nombre' => 'VITTAMAX Natural Adulto 15kg',                 'cat' => 'Alimento Perros',        'peso' => 15.0,  'um' => 'kg',   'pv' => 1598,  'stock' => 5],

            // ── Demo: catálogo adicional ──────────────────────────────────────────
            ['codigo_barras' => '7790430370011', 'marca' => 'Dog Chow',   'nombre' => 'DOG CHOW Adultos Med. y Grandes 21+3kg',       'cat' => 'Alimento Perros',        'peso' => 21.0,  'um' => 'kg',   'pv' => 3200,  'stock' => 8],
            ['codigo_barras' => '7797453000666', 'marca' => 'Pedigree',   'nombre' => 'PEDIGREE Carne y Vegetales 21kg',              'cat' => 'Alimento Perros',        'peso' => 21.0,  'um' => 'kg',   'pv' => 2800,  'stock' => 5],
            ['codigo_barras' => '7613036914635', 'marca' => 'Excellent',  'nombre' => 'EXCELLENT Cat Urinary 1kg',                    'cat' => 'Alimento Gatos',         'peso' => 1.0,   'um' => 'kg',   'pv' => 680,   'stock' => 6],
            ['codigo_barras' => '7730997410621', 'marca' => 'Nexgard',    'nombre' => 'NEXGARD 4.1 a 10 KG',                          'cat' => 'Antiparasitarios',       'peso' => null,  'um' => 'unid', 'pv' => 650,   'stock' => 12],
            ['codigo_barras' => '7730997410638', 'marca' => 'Nexgard',    'nombre' => 'NEXGARD 10.1 a 25 KG',                         'cat' => 'Antiparasitarios',       'peso' => null,  'um' => 'unid', 'pv' => 850,   'stock' => 8],
            ['codigo_barras' => '7730997410584', 'marca' => 'Frontline',  'nombre' => 'FRONTLINE PLUS Perros 10 a 20kg',              'cat' => 'Antiparasitarios',       'peso' => null,  'um' => 'unid', 'pv' => 480,   'stock' => 10],
            ['codigo_barras' => '7730997410553', 'marca' => 'Frontline',  'nombre' => 'FRONTLINE TOPSPOT Gato',                       'cat' => 'Antiparasitarios',       'peso' => null,  'um' => 'unid', 'pv' => 420,   'stock' => 7],
            ['codigo_barras' => '7798177480758', 'marca' => 'Organicat',  'nombre' => 'ORGANICAT Arena Sanitaria 2kg',                'cat' => 'Arena Sanitaria',        'peso' => 2.0,   'um' => 'unid', 'pv' => 280,   'stock' => 15],
            ['codigo_barras' => '1781',          'marca' => null,         'nombre' => 'COLLAR Cinta Nylon 37cm × 1.5cm',              'cat' => 'Collares',               'peso' => null,  'um' => 'unid', 'pv' => 180,   'stock' => 20],
            ['codigo_barras' => '1782',          'marca' => null,         'nombre' => 'COLLAR Cinta Nylon 38cm × 2cm',                'cat' => 'Collares',               'peso' => null,  'um' => 'unid', 'pv' => 200,   'stock' => 15],
            ['codigo_barras' => '3464',          'marca' => null,         'nombre' => 'CORREA RETRACTIL Mascota 3 Mts',               'cat' => 'Correas y Arneses',      'peso' => null,  'um' => 'unid', 'pv' => 350,   'stock' => 10],
            ['codigo_barras' => '2704',          'marca' => null,         'nombre' => 'PLATO Acero Inox 15cm',                        'cat' => 'Comederos y Bebederos',  'peso' => null,  'um' => 'unid', 'pv' => 220,   'stock' => 15],
            ['codigo_barras' => '2705',          'marca' => null,         'nombre' => 'PLATO Acero Inox 20cm',                        'cat' => 'Comederos y Bebederos',  'peso' => null,  'um' => 'unid', 'pv' => 260,   'stock' => 12],
            ['codigo_barras' => '7898591320897', 'marca' => 'Vetys',      'nombre' => 'VETYS Shampoo Neutro 500ml',                   'cat' => 'Higiene y Belleza',      'peso' => null,  'um' => 'unid', 'pv' => 320,   'stock' => 10],
            ['codigo_barras' => '7898920897311', 'marca' => 'Vetys',      'nombre' => 'VETYS Colonia Baby',                           'cat' => 'Higiene y Belleza',      'peso' => null,  'um' => 'unid', 'pv' => 280,   'stock' => 8],
            ['codigo_barras' => 'RAC001',        'marca' => 'El Ombu',    'nombre' => 'EL OMBU Maíz Entero 25kg',                     'cat' => 'Alimento Aves y Granja', 'peso' => 25.0,  'um' => 'kg',   'pv' => 120,   'stock' => 20],
            ['codigo_barras' => 'RAC002',        'marca' => 'El Ombu',    'nombre' => 'EL OMBU Maíz Quebrado 25kg',                   'cat' => 'Alimento Aves y Granja', 'peso' => 25.0,  'um' => 'kg',   'pv' => 110,   'stock' => 15],
            ['codigo_barras' => 'RAC005',        'marca' => 'Ri-Mar',     'nombre' => 'RI-MAR Cardenal 5kg',                          'cat' => 'Alimento Aves y Granja', 'peso' => 5.0,   'um' => 'kg',   'pv' => 85,    'stock' => 10],
            ['codigo_barras' => 'RAC006',        'marca' => 'Ri-Mar',     'nombre' => 'RI-MAR Girasol Chico 5kg',                     'cat' => 'Alimento Aves y Granja', 'peso' => 5.0,   'um' => 'kg',   'pv' => 90,    'stock' => 10],
            ['codigo_barras' => 'RAC007',        'marca' => 'Ri-Mar',     'nombre' => 'RI-MAR Alpiste 25kg',                          'cat' => 'Alimento Aves y Granja', 'peso' => 25.0,  'um' => 'kg',   'pv' => 150,   'stock' => 8],
            ['codigo_barras' => '7896588947379', 'marca' => 'Equilibrio', 'nombre' => 'EQUILIBRIO Mature 15kg',                       'cat' => 'Alimento Perros',        'peso' => 15.0,  'um' => 'kg',   'pv' => 2100,  'stock' => 4],
            ['codigo_barras' => '7897520009124', 'marca' => 'Procao',     'nombre' => 'PROCAO Shampoo Neutro 500ml',                  'cat' => 'Higiene y Belleza',      'peso' => null,  'um' => 'unid', 'pv' => 290,   'stock' => 6],
            ['codigo_barras' => '7896588940905', 'marca' => 'Equilibrio', 'nombre' => 'EQUILIBRIO Cat Castrado 7.5kg',                'cat' => 'Alimento Gatos',         'peso' => 7.5,   'um' => 'kg',   'pv' => 900,   'stock' => 5],
            ['codigo_barras' => '7898349703231', 'marca' => 'Monello',    'nombre' => 'MONELLO Dog Razas Pequeñas 7kg',               'cat' => 'Alimento Perros',        'peso' => 7.0,   'um' => 'kg',   'pv' => 480,   'stock' => 6],
            ['codigo_barras' => '7730918030921', 'marca' => 'Maxine',     'nombre' => 'MAXINE Adulto 21kg',                           'cat' => 'Alimento Perros',        'peso' => 21.0,  'um' => 'kg',   'pv' => 2500,  'stock' => 3],
            ['codigo_barras' => '7896803079861', 'marca' => 'Frost',      'nombre' => 'FROST Cat Indoor Sterilizado 7.5+1kg',         'cat' => 'Alimento Gatos',         'peso' => 7.5,   'um' => 'kg',   'pv' => 1100,  'stock' => 4],
        ];

        foreach ($productos as $p) {
            Producto::firstOrCreate(
                ['codigo_barras' => $p['codigo_barras']],
                [
                    'nombre'        => $p['nombre'],
                    'marca'         => $p['marca'] ?? null,
                    'categoria_id'  => $cat($p['cat']),
                    'peso'          => $p['peso'] ?? null,
                    'unidad_medida' => $p['um'],
                    'precio_venta'  => $p['pv'],
                    'stock'         => $p['stock'],
                    'activo'        => true,
                ]
            );
        }
    }
}
