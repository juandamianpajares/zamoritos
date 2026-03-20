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

        /**
         * Columnas:
         *   codigo, nombre, marca, peso_kg, um, precio_compra, precio_venta,
         *   stock, fraccionable, en_promo, precio_promo, categoria
         *
         * Precios de combos (PROMOS.csv):
         *   C1 Lager 22+10           → combo $2200  → precio_promo $1100 c/u
         *   C2 Primocao Negra 22+7   → combo $2493  → precio_promo $1247 c/u
         *   C3 Vittamax Classic 25+10→ combo $2870  → precio_promo $1435 c/u
         *   C4 Primocao Naranja 22+10→ combo $3300  → precio_promo $1650 c/u
         *   C5 Realcan 25+8          → combo $1990  → precio_promo  $995 c/u
         *   O1 Fortachon 25×2        → combo $2013  → precio_promo $1007 c/u (mismo producto)
         */
        $productos = [
            // ── COMBOS (precios reales de PROMOS.csv) ────────────────────────────
            ['codigo_barras' => '7730918030051', 'nombre' => 'LAGER Adulto 22kg',
             'marca' => 'LAGER',    'peso' => 22.0, 'um' => 'bolsa',
             'pc' => 1163, 'pv' => 1887, 'stock' => 0,
             'fraccionable' => true, 'en_promo' => true, 'precio_promo' => 1100,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7730918030044', 'nombre' => 'LAGER Adulto 10kg',
             'marca' => 'LAGER',    'peso' => 10.0, 'um' => 'bolsa',
             'pc' => 529,  'pv' => 1055, 'stock' => 0,
             'fraccionable' => false, 'en_promo' => true, 'precio_promo' => 1100,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7898510456119', 'nombre' => 'PRIMOCAO Mant. Negra 20+2kg',
             'marca' => 'PRIMOCAO', 'peso' => 22.0, 'um' => 'bolsa',
             'pc' => 1426, 'pv' => 2240, 'stock' => 0,
             'fraccionable' => true, 'en_promo' => true, 'precio_promo' => 1247,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7908320401046', 'nombre' => 'PRIMOCAO Mant. Negra 7kg',
             'marca' => 'PRIMOCAO', 'peso' => 7.0,  'um' => 'bolsa',
             'pc' => 454,  'pv' => 810,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => true, 'precio_promo' => 1247,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7898224823153', 'nombre' => 'VITTAMAX Classic 25kg',
             'marca' => 'VITTAMAX', 'peso' => 25.0, 'um' => 'bolsa',
             'pc' => 1578, 'pv' => 2190, 'stock' => 0,
             'fraccionable' => true, 'en_promo' => true, 'precio_promo' => 1435,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7898224824167', 'nombre' => 'VITTAMAX Classic 10kg',
             'marca' => 'VITTAMAX', 'peso' => 10.0, 'um' => 'bolsa',
             'pc' => 697,  'pv' => 990,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => true, 'precio_promo' => 1435,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7898510458878', 'nombre' => 'PRIMOCAO Premium Naranja 20+2kg',
             'marca' => 'PRIMOCAO', 'peso' => 22.0, 'um' => 'bolsa',
             'pc' => 1988, 'pv' => 2563, 'stock' => 0,
             'fraccionable' => true, 'en_promo' => true, 'precio_promo' => 1650,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7898510458854', 'nombre' => 'PRIMOCAO Premium Naranja 10kg',
             'marca' => 'PRIMOCAO', 'peso' => 10.0, 'um' => 'bolsa',
             'pc' => 904,  'pv' => 1248, 'stock' => 0,
             'fraccionable' => false, 'en_promo' => true, 'precio_promo' => 1650,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7730900660259', 'nombre' => 'REALCAN Adultos 25kg',
             'marca' => 'REALCAN',  'peso' => 25.0, 'um' => 'bolsa',
             'pc' => 1174, 'pv' => 1594, 'stock' => 0,
             'fraccionable' => true, 'en_promo' => true, 'precio_promo' => 995,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7730900660648', 'nombre' => 'REALCAN Adulto 8kg',
             'marca' => 'REALCAN',  'peso' => 8.0,  'um' => 'bolsa',
             'pc' => 376,  'pv' => 586,  'stock' => 5,
             'fraccionable' => false, 'en_promo' => true, 'precio_promo' => 995,
             'cat' => 'Alimento Perros'],

            // Fortachon: combo mismo producto × 2 (promo_producto_id queda null)
            ['codigo_barras' => '7730900660761', 'nombre' => 'FORTACHON Adulto 25kg',
             'marca' => 'FORTACHON','peso' => 25.0, 'um' => 'bolsa',
             'pc' => 805,  'pv' => 1208, 'stock' => 0,
             'fraccionable' => true, 'en_promo' => true, 'precio_promo' => 1007,
             'cat' => 'Alimento Perros'],

            // ── Otros alimentos (sin combo) ───────────────────────────────────────
            ['codigo_barras' => '8445290068798', 'nombre' => 'CAT CHOW Adultos Carne y Pollo 15kg',
             'marca' => 'Cat Chow',  'peso' => 15.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 4630, 'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7898349703637', 'nombre' => 'MONELLO Cat Castrado 10.1kg',
             'marca' => 'Monello',   'peso' => 10.1, 'um' => 'bolsa',
             'pc' => null, 'pv' => 392,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7898224825096', 'nombre' => 'VITTAMAX Natural Pequeño Porte 1kg',
             'marca' => 'VITTAMAX',  'peso' => 1.0,  'um' => 'bolsa',
             'pc' => null, 'pv' => 196,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7898224823122', 'nombre' => 'VITTAMAX Gato Carne 23+2kg',
             'marca' => 'VITTAMAX',  'peso' => 23.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 185,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7896588948253', 'nombre' => 'EQUILIBRIO Filhote 15+3kg',
             'marca' => 'Equilibrio','peso' => 15.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 672,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7896588948246', 'nombre' => 'EQUILIBRIO Adult All Breeds Active 15+3kg',
             'marca' => 'Equilibrio','peso' => 15.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 287,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7896588947379', 'nombre' => 'EQUILIBRIO Mature 15kg',
             'marca' => 'Equilibrio','peso' => 15.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 2100, 'stock' => 4,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7896588939138', 'nombre' => 'EQUILIBRIO Gatito Bebé 7.5kg',
             'marca' => 'Equilibrio','peso' => 7.5,  'um' => 'bolsa',
             'pc' => null, 'pv' => 170,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7896588940905', 'nombre' => 'EQUILIBRIO Cat Castrado 7.5kg',
             'marca' => 'Equilibrio','peso' => 7.5,  'um' => 'bolsa',
             'pc' => null, 'pv' => 900,  'stock' => 5,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7730918031102', 'nombre' => 'CONNIE Perro 22+3kg',
             'marca' => 'Connie',    'peso' => 22.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 2310, 'stock' => 0,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7730918030846', 'nombre' => 'CONNIE Gato Peixe 8kg',
             'marca' => 'Connie',    'peso' => 8.0,  'um' => 'bolsa',
             'pc' => null, 'pv' => 1204, 'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7730944740276', 'nombre' => 'CRIOLLA Gato 7kg',
             'marca' => 'Criolla',   'peso' => 7.0,  'um' => 'bolsa',
             'pc' => null, 'pv' => 960,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7730944740214', 'nombre' => 'CRIOLLA Adulto 7kg',
             'marca' => 'Criolla',   'peso' => 7.0,  'um' => 'bolsa',
             'pc' => null, 'pv' => 780,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7730918030921', 'nombre' => 'MAXINE Adulto 21kg',
             'marca' => 'Maxine',    'peso' => 21.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 2500, 'stock' => 3,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7730906560942', 'nombre' => 'REX Adulto 25kg',
             'marca' => 'Rex',       'peso' => 25.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 84,   'stock' => 0,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7730906561017', 'nombre' => 'KELLER Adulto 7kg',
             'marca' => 'Keller',    'peso' => 7.0,  'um' => 'bolsa',
             'pc' => null, 'pv' => 116,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => 'ND14228', 'nombre' => 'NATURAL DOG Adulto 7kg',
             'marca' => 'Natural Dog','peso' => 7.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 1156, 'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7898224827021', 'nombre' => 'VITTAMAX Natural Adulto 15kg',
             'marca' => 'VITTAMAX',  'peso' => 15.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 1598, 'stock' => 5,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7790430370011', 'nombre' => 'DOG CHOW Adultos Med. y Grandes 21+3kg',
             'marca' => 'Dog Chow',  'peso' => 21.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 3200, 'stock' => 8,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7797453000666', 'nombre' => 'PEDIGREE Carne y Vegetales 21kg',
             'marca' => 'Pedigree',  'peso' => 21.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 2800, 'stock' => 5,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7898349703231', 'nombre' => 'MONELLO Dog Razas Pequeñas 7kg',
             'marca' => 'Monello',   'peso' => 7.0,  'um' => 'bolsa',
             'pc' => null, 'pv' => 480,  'stock' => 6,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7896803080102', 'nombre' => 'ASTRO Selection Adulto 14+3kg',
             'marca' => 'Astro',     'peso' => 14.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 3067, 'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Perros'],

            ['codigo_barras' => '7896803079861', 'nombre' => 'FROST Cat Indoor Sterilizado 7.5+1kg',
             'marca' => 'Frost',     'peso' => 7.5,  'um' => 'bolsa',
             'pc' => null, 'pv' => 1100, 'stock' => 4,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7898939952957', 'nombre' => 'MATISSE Castrados Cordero 7.5kg',
             'marca' => 'Matisse',   'peso' => 7.5,  'um' => 'bolsa',
             'pc' => null, 'pv' => 910,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7613036914635', 'nombre' => 'EXCELLENT Cat Urinary 1kg',
             'marca' => 'Excellent', 'peso' => 1.0,  'um' => 'bolsa',
             'pc' => null, 'pv' => 680,  'stock' => 6,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7896588952106', 'nombre' => 'EQUILIBRIO Cat 7.5+750g',
             'marca' => 'Equilibrio','peso' => 7.5,  'um' => 'bolsa',
             'pc' => null, 'pv' => 434,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            ['codigo_barras' => '7898510459080', 'nombre' => 'PRIMOGATO Premium Castrado 15kg',
             'marca' => 'Primogato', 'peso' => 15.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 287,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Gatos'],

            // ── Alimento Húmedo y Snacks ──────────────────────────────────────────
            ['codigo_barras' => '7898363312716', 'nombre' => 'MAGNUS Galletas Original 400g',
             'marca' => 'Magnus',    'peso' => 0.4,  'um' => 'unidad',
             'pc' => null, 'pv' => 28,   'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Húmedo y Snacks'],

            ['codigo_barras' => '7898349701442', 'nombre' => 'MONELLO Diversão 300g',
             'marca' => 'Monello',   'peso' => 0.3,  'um' => 'unidad',
             'pc' => null, 'pv' => 180,  'stock' => 10,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Húmedo y Snacks'],

            // ── Arena Sanitaria ───────────────────────────────────────────────────
            ['codigo_barras' => '6970216830958', 'nombre' => 'CAT LITTER Bentonita Lavanda 4kg',
             'marca' => 'Cat Litter','peso' => 4.0,  'um' => 'unidad',
             'pc' => null, 'pv' => 240,  'stock' => 5,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Arena Sanitaria'],

            ['codigo_barras' => '675', 'nombre' => 'CAT LITTER Sin Aroma 8kg',
             'marca' => 'Cat Litter','peso' => 8.0,  'um' => 'unidad',
             'pc' => null, 'pv' => 613,  'stock' => 0,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Arena Sanitaria'],

            ['codigo_barras' => '6970216830620', 'nombre' => 'CAT LITTER Bentonita Rosas 4kg',
             'marca' => 'Cat Litter','peso' => 4.0,  'um' => 'unidad',
             'pc' => null, 'pv' => 480,  'stock' => 5,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Arena Sanitaria'],

            ['codigo_barras' => '7798177480758', 'nombre' => 'ORGANICAT Arena Sanitaria 2kg',
             'marca' => 'Organicat', 'peso' => 2.0,  'um' => 'unidad',
             'pc' => null, 'pv' => 280,  'stock' => 15,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Arena Sanitaria'],

            // ── Alimento Aves y Granja ────────────────────────────────────────────
            ['codigo_barras' => 'RAC001', 'nombre' => 'EL OMBU Maíz Entero 25kg',
             'marca' => 'El Ombu',   'peso' => 25.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 120,  'stock' => 20,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            ['codigo_barras' => 'RAC002', 'nombre' => 'EL OMBU Maíz Quebrado 25kg',
             'marca' => 'El Ombu',   'peso' => 25.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 110,  'stock' => 15,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            ['codigo_barras' => 'RAC003', 'nombre' => 'SAN JOSE Conejo 25kg',
             'marca' => 'San José',  'peso' => 25.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 200,  'stock' => 25,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            ['codigo_barras' => 'RAC004', 'nombre' => 'RAVAL Ponedora 25kg',
             'marca' => 'Raval',     'peso' => 25.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 35,   'stock' => 25,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            ['codigo_barras' => 'RAC005', 'nombre' => 'RI-MAR Cardenal 5kg',
             'marca' => 'Ri-Mar',    'peso' => 5.0,  'um' => 'bolsa',
             'pc' => null, 'pv' => 85,   'stock' => 10,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            ['codigo_barras' => 'RAC006', 'nombre' => 'RI-MAR Girasol Chico 5kg',
             'marca' => 'Ri-Mar',    'peso' => 5.0,  'um' => 'bolsa',
             'pc' => null, 'pv' => 90,   'stock' => 10,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            ['codigo_barras' => 'RAC007', 'nombre' => 'RI-MAR Alpiste 25kg',
             'marca' => 'Ri-Mar',    'peso' => 25.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 150,  'stock' => 8,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            ['codigo_barras' => 'RAC016', 'nombre' => 'RAVAL Iniciación Ponedoras 25kg',
             'marca' => 'Raval',     'peso' => 25.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 95,   'stock' => 0,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            ['codigo_barras' => 'RAC019', 'nombre' => 'RI-MAR Maragata Mix 25kg',
             'marca' => 'Ri-Mar',    'peso' => 25.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 200,  'stock' => 10,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            ['codigo_barras' => 'RAC023', 'nombre' => 'RI-MAR Maíz Especial Entero 25kg',
             'marca' => 'Ri-Mar',    'peso' => 25.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 189,  'stock' => 0,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            ['codigo_barras' => 'RAC024', 'nombre' => 'RI-MAR Maíz Quebrado 25kg',
             'marca' => 'Ri-Mar',    'peso' => 25.0, 'um' => 'bolsa',
             'pc' => null, 'pv' => 78,   'stock' => 0,
             'fraccionable' => true, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Alimento Aves y Granja'],

            // ── Antiparasitarios ──────────────────────────────────────────────────
            ['codigo_barras' => '7730997410621', 'nombre' => 'NEXGARD 4.1 a 10 KG',
             'marca' => 'Nexgard',   'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 650,  'stock' => 12,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Antiparasitarios'],

            ['codigo_barras' => '7730997410638', 'nombre' => 'NEXGARD 10.1 a 25 KG',
             'marca' => 'Nexgard',   'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 850,  'stock' => 8,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Antiparasitarios'],

            ['codigo_barras' => '7730997410584', 'nombre' => 'FRONTLINE PLUS Perros 10 a 20kg',
             'marca' => 'Frontline', 'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 480,  'stock' => 10,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Antiparasitarios'],

            ['codigo_barras' => '7730997410553', 'nombre' => 'FRONTLINE TOPSPOT Gato',
             'marca' => 'Frontline', 'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 420,  'stock' => 7,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Antiparasitarios'],

            // ── Higiene y Belleza ─────────────────────────────────────────────────
            ['codigo_barras' => '7897520009124', 'nombre' => 'PROCAO Shampoo Neutro 500ml',
             'marca' => 'Procao',    'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 290,  'stock' => 6,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Higiene y Belleza'],

            ['codigo_barras' => '7898591320897', 'nombre' => 'VETYS Shampoo Neutro 500ml',
             'marca' => 'Vetys',     'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 320,  'stock' => 10,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Higiene y Belleza'],

            ['codigo_barras' => '7898920897311', 'nombre' => 'VETYS Colonia Baby',
             'marca' => 'Vetys',     'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 280,  'stock' => 8,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Higiene y Belleza'],

            // ── Collares ──────────────────────────────────────────────────────────
            ['codigo_barras' => '1781', 'nombre' => 'COLLAR Cinta Nylon 37cm × 1.5cm',
             'marca' => null,         'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 180,  'stock' => 20,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Collares'],

            ['codigo_barras' => '1782', 'nombre' => 'COLLAR Cinta Nylon 38cm × 2cm',
             'marca' => null,         'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 200,  'stock' => 15,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Collares'],

            // ── Correas y Arneses ─────────────────────────────────────────────────
            ['codigo_barras' => '3464', 'nombre' => 'CORREA RETRACTIL Mascota 3 Mts',
             'marca' => null,         'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 350,  'stock' => 10,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Correas y Arneses'],

            // ── Comederos y Bebederos ─────────────────────────────────────────────
            ['codigo_barras' => '2704', 'nombre' => 'PLATO Acero Inox 15cm',
             'marca' => null,         'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 220,  'stock' => 15,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Comederos y Bebederos'],

            ['codigo_barras' => '2705', 'nombre' => 'PLATO Acero Inox 20cm',
             'marca' => null,         'peso' => null, 'um' => 'unidad',
             'pc' => null, 'pv' => 260,  'stock' => 12,
             'fraccionable' => false, 'en_promo' => false, 'precio_promo' => null,
             'cat' => 'Comederos y Bebederos'],
        ];

        foreach ($productos as $p) {
            Producto::updateOrCreate(
                ['codigo_barras' => $p['codigo_barras']],
                [
                    'nombre'        => $p['nombre'],
                    'marca'         => $p['marca'] ?? null,
                    'categoria_id'  => $cat($p['cat']),
                    'peso'          => $p['peso'] ?? null,
                    'unidad_medida' => $p['um'],
                    'precio_compra' => $p['pc'] ?? null,
                    'precio_venta'  => $p['pv'],
                    'fraccionable'  => $p['fraccionable'],
                    'en_promo'      => $p['en_promo'],
                    'precio_promo'  => $p['precio_promo'],
                    'stock'         => $p['stock'],
                    'activo'        => true,
                ]
            );
        }
    }
}
