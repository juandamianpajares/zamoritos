<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Database\Seeder;

/**
 * Catálogo extendido Zamoritos 2026.
 *
 * Códigos ZAM26XXX = código interno (sin barcode real).
 * Precios en UYU aproximados — ajustar via UI o CSV.
 * Imágenes: correr `php artisan imagenes:opff` para bajar fotos
 *           desde Open Pet Food Facts usando los barcodes reales.
 *
 * Categorías resueltas del árbol real de la BD:
 *   PERRO > ADULTO | CACHORRO | RAZA PEQUEÑA | RAZA MEDIANA | RAZA GRANDE | SENIOR | LIGHT
 *   GATO  > ADULTO | BEBE | CASTRADO | URINARY
 *   AVES  > MIX | ENGORDE | MAIZ QUEBRADO | MAIZ ENTERO | MONTE | ALPISTE | TRIGO
 *   SNACK | HIGENE | ESTETICA | PASEO | VENENO | VARIOS | LIMPIEZA | COMEDEROS | ROPA
 */
class ZamoritorsCatalogoSeeder extends Seeder
{
    public function run(): void
    {
        // ── Resolver categorías por nombre + contexto padre ───────────────────
        $allCats = Categoria::with('parent')->get();

        $cat = function (string $nombre, ?string $padre = null) use ($allCats): ?int {
            return $allCats->first(function ($c) use ($nombre, $padre) {
                if (strtoupper($c->nombre) !== strtoupper($nombre)) return false;
                if ($padre === null) return $c->parent_id === null;
                return $c->parent && strtoupper($c->parent->nombre) === strtoupper($padre);
            })?->id;
        };

        // IDs de categorías frecuentes
        $perroAdulto   = $cat('ADULTO',      'PERRO');
        $perroCachorro = $cat('CACHORRO',    'PERRO');
        $perroBebe     = $cat('BEBE',        'PERRO');
        $perroRzPeq    = $cat('RAZA PEQUEÑA','PERRO');
        $perroRzMed    = $cat('RAZA MEDIANA','PERRO');
        $perroRzGde    = $cat('RAZA GRANDE', 'PERRO');
        $perroSenior   = $cat('SENIOR',      'PERRO');
        $perroLight    = $cat('LIGHT',       'PERRO');
        $gatoAdulto    = $cat('ADULTO',      'GATO');
        $gatoBebe      = $cat('BEBE',        'GATO');
        $gatoCastrado  = $cat('CASTRADO',    'GATO');
        $gatoUrinary   = $cat('URINARY',     'GATO');
        $avesMix       = $cat('MIX',         'AVES');
        $avesEngorde   = $cat('ENGORDE',     'AVES');
        $avesTrigo     = $cat('TRIGO',       'AVES');
        $avesMaizQ     = $cat('MAIZ QUEBRADO','AVES');
        $avesMonte     = $cat('MONTE',       'AVES');
        $avesAlpiste   = $cat('ALPISTE',     'AVES');
        $snack         = $cat('SNACK');
        $higiene       = $cat('HIGENE');
        $estetica      = $cat('ESTETICA');
        $paseo         = $cat('PASEO');
        $veneno        = $cat('VENENO');
        $varios        = $cat('VARIOS');
        $limpieza      = $cat('LIMPIEZA');
        $ropa          = $cat('ROPA');

        // ── Helper: upsert por codigo_barras ──────────────────────────────────
        // [codigo, nombre, marca, categoria_id, peso_kg, um, pc, pv]
        $p = function (
            string  $codigo,
            string  $nombre,
            ?string $marca,
            ?int    $categoriaId,
            float   $peso    = 0,
            string  $um      = 'unidad',
            int     $pc      = 0,
            int     $pv      = 0
        ) {
            Producto::firstOrCreate(
                ['codigo_barras' => $codigo],
                [
                    'nombre'        => $nombre,
                    'marca'         => $marca,
                    'categoria_id'  => $categoriaId,
                    'peso'          => $peso ?: null,
                    'unidad_medida' => $um,
                    'precio_compra' => $pc,
                    'precio_venta'  => $pv,
                    'stock'         => 0,
                    'activo'        => true,
                ]
            );
        };

        // ══════════════════════════════════════════════════════════════════════
        // PERRO — ADULTO (razas medianas y grandes)
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26001', 'EQUILIBRIO All Breed Sabor Carne 15kg',       'Equilibrio',      $perroAdulto,  15.0, 'bolsa', 1050, 1580);
        $p('ZAM26002', 'EQUILIBRIO All Breed Sabor Pollo 15kg',       'Equilibrio',      $perroAdulto,  15.0, 'bolsa', 1050, 1580);
        $p('ZAM26003', 'FROST Adult Medium & Large 15kg',             'Frost',           $perroAdulto,  15.0, 'bolsa',  980, 1490);
        $p('ZAM26004', 'FROST Adult Medium & Large 25kg',             'Frost',           $perroAdulto,  25.0, 'bolsa', 1550, 2300);
        $p('ZAM26005', 'MONELLO Adultos Pollo y Carne 15kg',          'Monello',         $perroAdulto,  15.0, 'bolsa',  920, 1400);
        $p('ZAM26006', 'MONELLO Adultos Pollo y Carne 25kg',          'Monello',         $perroAdulto,  25.0, 'bolsa', 1420, 2100);
        $p('ZAM26007', 'NERO Adulto 25kg',                            'Nero',            $perroAdulto,  25.0, 'bolsa',  820, 1250);
        $p('ZAM26008', 'PROT 21 Adultos Carne y Vegetales 25kg',      'Prot 21',         $perroAdulto,  25.0, 'bolsa',  870, 1320);
        $p('ZAM26009', 'KONGO Adulto Mediano y Grande 25kg',          'Kongo',           $perroAdulto,  25.0, 'bolsa',  830, 1260);
        $p('ZAM26010', 'KONGO GOLD Adulto 15kg',                      'Kongo Gold',      $perroAdulto,  15.0, 'bolsa', 1100, 1650);
        $p('ZAM26011', 'SMART Adulto 25kg',                           'Smart',           $perroAdulto,  25.0, 'bolsa',  790, 1200);
        $p('ZAM26012', 'DOGUI Adulto 25kg',                           'Dogui',           $perroAdulto,  25.0, 'bolsa',  800, 1220);
        $p('ZAM26013', 'MIKDOG Adulto 25kg',                          'Mikdog',          $perroAdulto,  25.0, 'bolsa',  810, 1230);
        $p('ZAM26014', 'ECOPET Adultos 25kg',                         'Ecopet',          $perroAdulto,  25.0, 'bolsa',  780, 1190);
        $p('ZAM26015', 'BIRBO Adultos Cordero y Vegetales 15kg',      'Birbo',           $perroAdulto,  15.0, 'bolsa',  960, 1450);
        $p('ZAM26016', 'BIRBO Adultos Pollo Tradicional 15kg',        'Birbo',           $perroAdulto,  15.0, 'bolsa',  940, 1420);
        $p('ZAM26017', 'MAX Performance Adulto 20kg',                 'Max',             $perroAdulto,  20.0, 'bolsa',  900, 1370);
        $p('ZAM26018', 'THE GOLDEN CHOICE Adulto 15kg',               'The Golden Choice',$perroAdulto, 15.0, 'bolsa', 1150, 1720);
        $p('ZAM26019', 'CHARRUA Adulto 25kg',                         'Charrua',         $perroAdulto,  25.0, 'bolsa',  840, 1280);
        $p('ZAM26020', 'SELECT Digestion Raza Mediana y Grande 15kg', 'Select',          $perroAdulto,  15.0, 'bolsa',  990, 1500);
        $p('ZAM26021', 'OLD PRINCE Premium Adulto Pollo y Carne 15kg','Old Prince',      $perroAdulto,  15.0, 'bolsa', 1380, 2050);
        $p('ZAM26022', 'OLD PRINCE Adulto Cerdo y Legumbres 15kg',    'Old Prince',      $perroAdulto,  15.0, 'bolsa', 1300, 1940);
        $p('ZAM26023', 'N&D Ocean Salmon Mediano y Grande 12kg',      'N&D',             $perroAdulto,  12.0, 'bolsa', 3200, 4600);
        $p('ZAM26024', 'BIOFRESH Adulto 15kg',                        'Biofresh',        $perroAdulto,  15.0, 'bolsa', 1450, 2150);
        $p('ZAM26025', 'PREMIUM Adulto Cordero 15kg',                 'Premium',         $perroAdulto,  15.0, 'bolsa',  970, 1470);
        $p('ZAM26026', 'MAX VITA Buffet 20kg',                        'Max Vita',        $perroAdulto,  20.0, 'bolsa',  870, 1330);

        // ══════════════════════════════════════════════════════════════════════
        // PERRO — CACHORRO / BEBE
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26030', 'EQUILIBRIO Cachorro 15kg',                    'Equilibrio',      $perroCachorro,15.0, 'bolsa', 1100, 1650);
        $p('ZAM26031', 'KELLER Cachorro 15kg',                        'Keller',          $perroCachorro,15.0, 'bolsa',  950, 1440);
        $p('ZAM26032', 'FROST Puppy Medium & Large 15kg',             'Frost',           $perroCachorro,15.0, 'bolsa', 1050, 1590);
        $p('ZAM26033', 'MONELLO Cachorro Pollo 15kg',                 'Monello',         $perroCachorro,15.0, 'bolsa',  980, 1490);
        $p('ZAM26034', 'VITTAMAX Natural Cachorro 25kg',              'Vittamax',        $perroCachorro,25.0, 'bolsa', 1250, 1860);
        $p('ZAM26035', 'MATISSE Filhote Cachorro 15kg',               'Matisse',         $perroCachorro,15.0, 'bolsa', 1180, 1760);
        $p('ZAM26036', 'MAX VITA Filhote 20kg',                       'Max Vita',        $perroCachorro,20.0, 'bolsa',  920, 1400);
        $p('ZAM26037', 'FORMULA NATURAL Cachorro Raza Pequeña 2.5kg', 'Formula Natural', $perroBebe,     2.5, 'bolsa',  950, 1430);

        // ══════════════════════════════════════════════════════════════════════
        // PERRO — RAZA PEQUEÑA
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26040', 'EQUILIBRIO Raza Pequeña 7.5kg',               'Equilibrio',      $perroRzPeq,   7.5, 'bolsa',  830, 1260);
        $p('ZAM26041', 'EQUILIBRIO Filhotes Raza Pequeña 7.5kg',      'Equilibrio',      $perroRzPeq,   7.5, 'bolsa',  870, 1320);
        $p('ZAM26042', 'FROST Puppy Mini & Small 7.5kg',              'Frost',           $perroRzPeq,   7.5, 'bolsa',  820, 1250);
        $p('ZAM26043', 'FROST Adult Mini & Small 7.5kg',              'Frost',           $perroRzPeq,   7.5, 'bolsa',  800, 1220);
        $p('ZAM26044', 'MIKDOG Adulto Raza Pequeña 10kg',             'Mikdog',          $perroRzPeq,  10.0, 'bolsa',  700, 1080);
        $p('ZAM26045', 'MIKDOG Premium Especial Raza Pequeña 10kg',   'Mikdog',          $perroRzPeq,  10.0, 'bolsa',  760, 1160);
        $p('ZAM26046', 'MAXINE Adulto Raza Pequeña 10kg',             'Maxine',          $perroRzPeq,  10.0, 'bolsa',  780, 1190);
        $p('ZAM26047', 'NERO Raza Pequeña 15kg',                      'Nero',            $perroRzPeq,  15.0, 'bolsa',  870, 1330);
        $p('ZAM26048', 'MONELLO Adultos Raza Pequeña 10kg',           'Monello',         $perroRzPeq,  10.0, 'bolsa',  740, 1130);
        $p('ZAM26049', 'FORMULA NATURAL Adulto Raza Pequeña 2.5kg',   'Formula Natural', $perroRzPeq,   2.5, 'bolsa',  900, 1370);
        $p('ZAM26050', 'FORMULA NATURAL Control de Peso Raza Peq 2.5kg','Formula Natural',$perroLight,  2.5, 'bolsa',  920, 1400);
        $p('ZAM26051', 'ORIGENS Premium Especial Raza Pequeña Light 2.5kg','Origens',    $perroRzPeq,   2.5, 'bolsa', 1100, 1660);
        $p('ZAM26052', 'BIOFRESH Adulto Raza Pequeña 10kg',           'Biofresh',        $perroRzPeq,  10.0, 'bolsa', 1050, 1590);

        // ══════════════════════════════════════════════════════════════════════
        // PERRO — SENIOR / LIGHT
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26055', 'FROST Senior Medium & Large 15kg',            'Frost',           $perroSenior,  15.0, 'bolsa', 1020, 1550);
        $p('ZAM26056', 'MAX Mature Senior 15kg',                      'Max',             $perroSenior,  15.0, 'bolsa',  960, 1460);
        $p('ZAM26057', 'FROST Sensitive Skin 15kg',                   'Frost',           $perroLight,   15.0, 'bolsa', 1080, 1640);
        $p('ZAM26058', 'FROST Senior Cat Sterilizado 7.5kg',          'Frost',           $gatoCastrado,  7.5, 'bolsa',  870, 1330);

        // ══════════════════════════════════════════════════════════════════════
        // GATO — ADULTO
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26060', 'LAGER Gato Adulto 10kg',                      'Lager',           $gatoAdulto,   10.0, 'bolsa',  650, 1000);
        $p('ZAM26061', 'VITTAMAX Gato Mix Adulto 10kg',               'Vittamax',        $gatoAdulto,   10.0, 'bolsa',  700, 1070);
        $p('ZAM26062', 'EQUILIBRIO Cat Adulto 7.5kg',                 'Equilibrio',      $gatoAdulto,    7.5, 'bolsa',  790, 1210);
        $p('ZAM26063', 'PELUSA Cat Adulto 10kg',                      'Pelusa',          $gatoAdulto,   10.0, 'bolsa',  620, 950);
        $p('ZAM26064', 'NERO Cat Adulto 10kg',                        'Nero',            $gatoAdulto,   10.0, 'bolsa',  640, 980);
        $p('ZAM26065', 'VORAZ Gato Adulto 10kg',                      'Voraz',           $gatoAdulto,   10.0, 'bolsa',  660, 1010);
        $p('ZAM26066', 'MAXINE Gato Adulto 10kg',                     'Maxine',          $gatoAdulto,   10.0, 'bolsa',  680, 1040);
        $p('ZAM26067', 'MONELLO Gatitos Salmon y Pollo 10kg',         'Monello',         $gatoBebe,     10.0, 'bolsa',  720, 1100);
        $p('ZAM26068', 'BIRBO Gatitos 10kg',                          'Birbo',           $gatoBebe,     10.0, 'bolsa',  700, 1070);
        $p('ZAM26069', 'OLD PRINCE Urinary Gato 7.5kg',               'Old Prince',      $gatoUrinary,   7.5, 'bolsa', 1350, 2000);
        $p('ZAM26070', 'VITTAMAX Gato Salmon Castrado 10kg',          'Vittamax',        $gatoCastrado,  10.0,'bolsa',  730, 1120);
        $p('ZAM26071', 'VITTAMAX Gato Pollo Castrado 10kg',           'Vittamax',        $gatoCastrado,  10.0,'bolsa',  730, 1120);
        $p('ZAM26072', 'LAGER Gatos Castrados 10kg',                  'Lager',           $gatoCastrado,  10.0,'bolsa',  670, 1030);
        $p('ZAM26073', 'VITTAMAX Gato Peixe Adulto 10kg',             'Vittamax',        $gatoAdulto,   10.0, 'bolsa',  700, 1070);
        $p('ZAM26074', 'MATISSE Salmao y Arroz Gato 7.5kg',           'Matisse',         $gatoAdulto,    7.5, 'bolsa',  920, 1400);
        $p('ZAM26075', 'MATISSE Castrados Salmao 7.5kg',              'Matisse',         $gatoCastrado,   7.5,'bolsa',  940, 1430);
        $p('ZAM26076', 'EQUILIBRIO Gato Adulto Castrado 7.5kg',       'Equilibrio',      $gatoCastrado,   7.5,'bolsa',  810, 1240);

        // ══════════════════════════════════════════════════════════════════════
        // SNACKS — húmedos, sachets, pates, premios
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26080', 'PATE PRIMOGATO Premium Carne 300g',           'Primogato',       $snack,         0.3, 'unidad', 62,  98);
        $p('ZAM26081', 'PATE PRIMOGATO Premium Filhotes 300g',        'Primogato',       $snack,         0.3, 'unidad', 62,  98);
        $p('ZAM26082', 'PATE PRIMOCAO Carne 300g',                    'Primocao',        $snack,         0.3, 'unidad', 58,  92);
        $p('ZAM26083', 'PATE PRIMOCAO Carne y Vegetales 300g',        'Primocao',        $snack,         0.3, 'unidad', 58,  92);
        $p('ZAM26084', 'SACHET PRIMOGATO Filhotes Pollo 85g',         'Primogato',       $snack,         0.085,'unidad',38,  60);
        $p('ZAM26085', 'SACHET PRIMOGATO Carne 85g',                  'Primogato',       $snack,         0.085,'unidad',35,  56);
        $p('ZAM26086', 'SACHET PRIMOGATO Pescado 85g',                'Primogato',       $snack,         0.085,'unidad',35,  56);
        $p('ZAM26087', 'SACHET PRIMOCAO Carne 85g',                   'Primocao',        $snack,         0.085,'unidad',32,  52);
        $p('ZAM26088', 'SACHET PRIMOCAO Junior Pollo 85g',            'Primocao',        $snack,         0.085,'unidad',32,  52);
        $p('ZAM26089', 'CREAMY SNACK Gatos Salmon 15g',               'Creamy Snack',    $snack,         0.015,'unidad',22,  36);
        $p('ZAM26090', 'CREAMY SNACK Gatos Atun y Bonito 15g',        'Creamy Snack',    $snack,         0.015,'unidad',22,  36);
        $p('ZAM26091', 'CAT CHOW Salsa Adultos Carne 85g',            'Cat Chow',        $snack,         0.085,'unidad',40,  64);
        $p('ZAM26092', 'CAT CHOW Salsa Adultos Pescado 85g',          'Cat Chow',        $snack,         0.085,'unidad',40,  64);
        $p('ZAM26093', 'CAT CHOW Salsa Castrados Pescado 85g',        'Cat Chow',        $snack,         0.085,'unidad',42,  66);
        $p('ZAM26094', 'CAT CHOW Gatitos Pollo 85g',                  'Cat Chow',        $snack,         0.085,'unidad',42,  66);
        $p('ZAM26095', 'SALSA GRAN PLUS Perro Adulto Carne 85g',      'Gran Plus',       $snack,         0.085,'unidad',30,  48);
        $p('ZAM26096', 'SALSA GRAN PLUS Perro Adulto Pollo 85g',      'Gran Plus',       $snack,         0.085,'unidad',30,  48);
        $p('ZAM26097', 'SALSA GRAN PLUS Perro Adulto Salmon y Pollo 85g','Gran Plus',    $snack,         0.085,'unidad',30,  48);
        $p('ZAM26098', 'SALSA GRAN PLUS Filhote 85g',                 'Gran Plus',       $snack,         0.085,'unidad',32,  50);
        $p('ZAM26099', 'SALSA ORIGENS Adultos Carne y Zapallo 85g',   'Origens',         $snack,         0.085,'unidad',45,  72);
        $p('ZAM26100', 'SALSA ORIGENS Filhotes Carne Pollo y Batata 85g','Origens',      $snack,         0.085,'unidad',45,  72);
        $p('ZAM26101', 'SALSA ORIGENS Adultos Raza Pequeña Pollo y Zanahoria 85g','Origens',$snack,      0.085,'unidad',45,  72);
        $p('ZAM26102', 'SALSA ORIGENS Gato Adulto y Cachorro Carne 85g','Origens',       $snack,         0.085,'unidad',45,  72);
        $p('ZAM26103', 'SALSA ORIGENS Gato Castrado Pollo y Arroz 85g','Origens',        $snack,         0.085,'unidad',45,  72);
        $p('ZAM26104', 'FELIX Salsa Carne 85g',                       'Felix',           $snack,         0.085,'unidad',48,  76);
        $p('ZAM26105', 'FELIX Salsa Salmon 85g',                      'Felix',           $snack,         0.085,'unidad',48,  76);
        $p('ZAM26106', 'FELIX Salsa Classic Gatitos Pescado 85g',     'Felix',           $snack,         0.085,'unidad',48,  76);
        $p('ZAM26107', 'MIKDOG Salsa Carne Adultos 85g',              'Mikdog',          $snack,         0.085,'unidad',28,  44);
        $p('ZAM26108', 'FORMULA NATURAL Dog Biscuits Calabaza Coco y Quinoa 250g','Formula Natural',$snack,0.25,'unidad',180,285);

        // ══════════════════════════════════════════════════════════════════════
        // AVES Y GRANJA
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26110', 'RAVAL Parrillero Terminador Engorde 25kg',    'Raval',           $avesEngorde,  25.0, 'bolsa',  820, 1250);
        $p('ZAM26111', 'RI-MART Girasol 25kg',                        'Ri-Mart',         $avesMix,      25.0, 'bolsa',  890, 1350);
        $p('ZAM26112', 'RI-MART Monte 25kg',                          'Ri-Mart',         $avesMonte,    25.0, 'bolsa',  780, 1190);
        $p('ZAM26113', 'RI-MART Trigo 25kg',                          'Ri-Mart',         $avesTrigo,    25.0, 'bolsa',  700, 1070);
        $p('ZAM26114', 'RI-MART Avena 25kg',                          'Ri-Mart',         $avesMix,      25.0, 'bolsa',  720, 1100);
        $p('ZAM26115', 'RI-MART Maiz Quebrado 25kg',                  'Ri-Mart',         $avesMaizQ,    25.0, 'bolsa',  680, 1040);
        $p('ZAM26116', 'SAN JOSE Polenta 25kg',                       'San José',        $avesMix,      25.0, 'bolsa',  760, 1160);
        $p('ZAM26117', 'ALPISTE a granel kg',                         null,              $avesAlpiste,   0,   'kg',      48,  78);
        $p('ZAM26118', 'PALITOS de Cereales Colores kg',              null,              $avesMix,       0,   'kg',      55,  88);
        $p('ZAM26119', 'MAIZ ENTERO 25kg',                            null,              $avesMaizQ,    25.0, 'bolsa',  650,  990);

        // ══════════════════════════════════════════════════════════════════════
        // HIGIENE — Arenas sanitarias
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26120', 'CAT LITTER Bentonita Limon 4kg',              'Cat Litter',      $higiene,       4.0, 'unidad', 280, 440);
        $p('ZAM26121', 'CAT LITTER Bentonita Manzana 4kg',            'Cat Litter',      $higiene,       4.0, 'unidad', 280, 440);
        $p('ZAM26122', 'CAT LITTER Bentonita Cafe 4kg',               'Cat Litter',      $higiene,       4.0, 'unidad', 280, 440);
        $p('ZAM26123', 'CAT LITTER Limon 4kg',                        'Cat Litter',      $higiene,       4.0, 'unidad', 270, 425);
        $p('ZAM26124', 'CAT LITTER Lavanda 4kg',                      'Cat Litter',      $higiene,       4.0, 'unidad', 270, 425);
        $p('ZAM26125', 'PIPICAT Sanitaria Gato 4kg',                  'Pipicat',         $higiene,       4.0, 'unidad', 290, 460);
        $p('ZAM26126', 'CAT LITTER Aglomerante Neutro 10kg',          'Cat Litter',      $higiene,      10.0, 'unidad', 580, 900);

        // ══════════════════════════════════════════════════════════════════════
        // ESTÉTICA / HIGIENE — Shampoos, aseo
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26130', 'PROCAO Shampoo Citronela 500ml',              'Procao',          $estetica,      0.5, 'unidad', 220, 350);
        $p('ZAM26131', 'PROCAO Shampoo Cachorros 500ml',              'Procao',          $estetica,      0.5, 'unidad', 210, 335);
        $p('ZAM26132', 'PROCAO Shampoo Pelo Negro 500ml',             'Procao',          $estetica,      0.5, 'unidad', 215, 342);
        $p('ZAM26133', 'PROCAO Shampoo y Acondicionador 500ml',       'Procao',          $estetica,      0.5, 'unidad', 230, 365);
        $p('ZAM26134', 'PROCAO Shampoo Clorexidina 500ml',            'Procao',          $estetica,      0.5, 'unidad', 240, 380);
        $p('ZAM26135', 'PROCAO Limpia Patas 250ml',                   'Procao',          $estetica,      0.25,'unidad', 180, 285);
        $p('ZAM26136', 'UP CLEAN Shampoo Cachorro 750ml',             'Up Clean',        $estetica,      0.75,'unidad', 250, 395);
        $p('ZAM26137', 'UP CLEAN Baño Seco Gato 200ml',               'Up Clean',        $estetica,      0.2, 'unidad', 220, 350);
        $p('ZAM26138', 'DOMINAL Shampoo Pulgas y Garrapatas 250ml',   'Dominal',         $estetica,      0.25,'unidad', 290, 460);
        $p('ZAM26139', 'BAÑO SECO Espuma Yoji 300ml',                 'Yoji',            $estetica,      0.3, 'unidad', 240, 380);
        $p('ZAM26140', 'TOALLITAS HUMEDAS para Ojos x120',            null,              $estetica,      0,   'unidad', 180, 285);
        $p('ZAM26141', 'VETYS Spray No Lamidas y Mordidas 120ml',     'Vetys',           $higiene,       0.12,'unidad', 320, 505);
        $p('ZAM26142', 'CURAMIC AG Plata Microsules 290g',            'Curamic',         $higiene,       0.29,'unidad', 420, 665);
        $p('ZAM26143', 'DENTAL Care Kit 4 Piezas',                    'Dental',          $higiene,       0,   'unidad', 280, 445);

        // ══════════════════════════════════════════════════════════════════════
        // VENENO — Antiparasitarios y control de plagas
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26150', 'NEXGARD 2 a 4 kg (1 comprimido)',             'Nexgard',         $veneno,        0,   'unidad', 520, 820);
        $p('ZAM26151', 'NEXGARD 25.1 a 50 kg (1 comprimido)',         'Nexgard',         $veneno,        0,   'unidad', 680, 1075);
        $p('ZAM26152', 'NEXGARD SPECTRA 3.6 a 7.5 kg',               'Nexgard Spectra', $veneno,        0,   'unidad', 780, 1230);
        $p('ZAM26153', 'NEXGARD SPECTRA 7.6 a 15 kg',                'Nexgard Spectra', $veneno,        0,   'unidad', 820, 1295);
        $p('ZAM26154', 'NEXGARD SPECTRA 15.1 a 30 kg',               'Nexgard Spectra', $veneno,        0,   'unidad', 880, 1390);
        $p('ZAM26155', 'NEXGARD SPECTRA 30.1 a 60 kg',               'Nexgard Spectra', $veneno,        0,   'unidad', 940, 1485);
        $p('ZAM26156', 'REVOLUTION Gato 2.6 a 7.5 kg',               'Revolution',      $veneno,        0,   'unidad', 600, 948);
        $p('ZAM26157', 'DOMINAL PIPETA Gato hasta 4 kg',              'Dominal',         $veneno,        0,   'unidad', 290, 458);
        $p('ZAM26158', 'DOMINAL PIPETA Gato más de 4 kg',             'Dominal',         $veneno,        0,   'unidad', 310, 490);
        $p('ZAM26159', 'DOMINAL PIPETA Perro hasta 5 kg',             'Dominal',         $veneno,        0,   'unidad', 280, 442);
        $p('ZAM26160', 'DOMINAL PIPETA Perro 5.1 a 10 kg',            'Dominal',         $veneno,        0,   'unidad', 300, 474);
        $p('ZAM26161', 'DOMINAL PIPETA Perro 10.1 a 25 kg',           'Dominal',         $veneno,        0,   'unidad', 330, 521);
        $p('ZAM26162', 'DOMINAL PIPETA Perro 25.1 a 40 kg',           'Dominal',         $veneno,        0,   'unidad', 370, 585);
        $p('ZAM26163', 'DOMINAL PIPETA Perro más de 40 kg',           'Dominal',         $veneno,        0,   'unidad', 400, 632);
        $p('ZAM26164', 'DOMINAL PIPETA MAX Perro 5.1 a 10 kg',        'Dominal Max',     $veneno,        0,   'unidad', 360, 568);
        $p('ZAM26165', 'DOMINAL PIPETA MAX Perro 25.1 a 40 kg',       'Dominal Max',     $veneno,        0,   'unidad', 420, 663);
        $p('ZAM26166', 'NEOCIDOL Garrapaticida Pulgicida Sarnicida',  'Neocidol',        $veneno,        0,   'unidad', 480, 758);
        $p('ZAM26167', 'APPRYL Caja x240 Comprimidos',                'Appryl',          $veneno,        0,   'unidad', 280, 442);
        $p('ZAM26168', 'SUPRALINE Antiparasitario Gato',              'Supraline',       $veneno,        0,   'unidad', 320, 505);
        $p('ZAM26169', 'JIMO Hormigas Polvo Talquera',                'Jimo',            $veneno,        0,   'unidad', 180, 285);
        $p('ZAM26170', 'JIMO Mata Baratas Gas',                       'Jimo',            $veneno,        0,   'unidad', 210, 332);
        $p('ZAM26171', 'JIMO Anti-Insect Aerosol 400ml',              'Jimo',            $veneno,        0.4, 'unidad', 220, 348);
        $p('ZAM26172', 'STORM Raticida y Rodenticida',                'Storm',           $veneno,        0,   'unidad', 260, 411);
        $p('ZAM26173', 'TALCOBAL Talco Pulgicida',                    'Talcobal',        $veneno,        0,   'unidad', 150, 237);
        $p('ZAM26174', 'LAMPO Granulado Caracolicida',                'Lampo',           $veneno,        0,   'unidad', 190, 300);
        $p('ZAM26175', 'DR. CARACOL Caracolicida',                    'Dr. Caracol',     $veneno,        0,   'unidad', 200, 316);
        $p('ZAM26176', 'RATICIDA Pega-Pega Mouse Trap',               null,              $veneno,        0,   'unidad', 120, 190);
        $p('ZAM26177', 'CREOLINA Concentrada 1 Litro',                null,              $limpieza,      1.0, 'unidad', 280, 442);
        $p('ZAM26178', 'BIOCLIN Graseras y Desagues 1L',              'Bioclin',         $limpieza,      1.0, 'unidad', 320, 505);

        // ══════════════════════════════════════════════════════════════════════
        // PASEO — Collares, correas, accesorios
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26200', 'DOMINAL COLLAR Perro Chico y Cachorro',       'Dominal',         $paseo,         0,   'unidad', 180, 285);
        $p('ZAM26201', 'DOMINAL COLLAR Perro Mediano',                'Dominal',         $paseo,         0,   'unidad', 200, 316);
        $p('ZAM26202', 'DOMINAL COLLAR Perro Grande',                 'Dominal',         $paseo,         0,   'unidad', 220, 348);
        $p('ZAM26203', 'DOMINAL COLLAR Perro Extra Grande',           'Dominal',         $paseo,         0,   'unidad', 240, 379);
        $p('ZAM26204', 'DOMINAL COLLAR Gato',                         'Dominal',         $paseo,         0,   'unidad', 160, 253);
        $p('ZAM26205', 'COLLAR Cinta Nylon N°3',                      null,              $paseo,         0,   'unidad', 120, 190);
        $p('ZAM26206', 'COLLAR Cinta Nylon N°4',                      null,              $paseo,         0,   'unidad', 130, 205);
        $p('ZAM26207', 'COLLAR Reforzado Chico',                      null,              $paseo,         0,   'unidad', 150, 237);
        $p('ZAM26208', 'COLLAR Reforzado Grande',                     null,              $paseo,         0,   'unidad', 170, 269);
        $p('ZAM26209', 'COLLAR Figuras M',                            null,              $paseo,         0,   'unidad', 140, 221);
        $p('ZAM26210', 'COLLAR Silicona x6 Varios Diseños',           null,              $paseo,         0,   'unidad', 110, 174);
        $p('ZAM26211', 'COLLAR Isabelino N°1',                        null,              $varios,        0,   'unidad',  90, 142);
        $p('ZAM26212', 'COLLAR Isabelino N°2',                        null,              $varios,        0,   'unidad',  95, 150);
        $p('ZAM26213', 'COLLAR Isabelino N°3',                        null,              $varios,        0,   'unidad', 100, 158);
        $p('ZAM26214', 'COLLAR Isabelino N°4',                        null,              $varios,        0,   'unidad', 110, 174);
        $p('ZAM26215', 'COLLAR Isabelino N°5',                        null,              $varios,        0,   'unidad', 120, 190);
        $p('ZAM26216', 'COLLAR Isabelino N°6',                        null,              $varios,        0,   'unidad', 130, 205);
        $p('ZAM26217', 'COLLAR Isabelino N°7',                        null,              $varios,        0,   'unidad',  85, 134);
        $p('ZAM26218', 'COLLAR de Ahorque Dorado 2mm x40cm',          null,              $paseo,         0,   'unidad',  80, 126);
        $p('ZAM26219', 'COLLAR de Ahorque Dorado 2.5mm x45cm',        null,              $paseo,         0,   'unidad',  90, 142);
        $p('ZAM26220', 'COLLAR de Ahorque Dorado 3mm x50cm',          null,              $paseo,         0,   'unidad', 100, 158);
        $p('ZAM26221', 'COLLAR de Ahorque Dorado 4mm x60cm',          null,              $paseo,         0,   'unidad', 110, 174);
        $p('ZAM26222', 'COLLAR de Ahorque Dorado 5mm x80cm',          null,              $paseo,         0,   'unidad', 130, 205);

        // ══════════════════════════════════════════════════════════════════════
        // VARIOS — Medicamentos y suplementos
        // ══════════════════════════════════════════════════════════════════════
        $p('ZAM26230', 'PREVICOX 227mg 30 Comprimidos',               'Previcox',        $varios,        0,   'unidad', 1800, 2840);
        $p('ZAM26231', 'VITALFLEX 30 Comprimidos',                    'Vitalflex',       $varios,        0,   'unidad',  480,  758);
    }
}
