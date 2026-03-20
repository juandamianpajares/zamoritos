<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Database\Seeder;

/**
 * Catálogo completo Zamoritos 2026.
 * Códigos internos ZAM26XXX asignados donde no hay código de barras real.
 * precio_venta = 0 (placeholder) — actualizar via UI o importador CSV.
 */
class ZamoritorsCatalogoSeeder extends Seeder
{
    public function run(): void
    {
        $cat = fn(string $n) => Categoria::where('nombre', $n)->value('id');

        // Helper: firstOrCreate por codigo_barras, con datos base
        $p = function (string $codigo, string $nombre, string $marca, string $catNombre, string $um = 'unidad', float $peso = null) use ($cat) {
            Producto::firstOrCreate(
                ['codigo_barras' => $codigo],
                [
                    'nombre'        => $nombre,
                    'marca'         => $marca ?: null,
                    'categoria_id'  => $cat($catNombre),
                    'peso'          => $peso,
                    'unidad_medida' => $um,
                    'precio_venta'  => 0,
                    'activo'        => true,
                ]
            );
        };

        // ── ALIMENTO PERROS ──────────────────────────────────────────────────
        $p('ZAM26001', 'LAGER Gato',                          'LAGER',          'Alimento Gatos',   'bolsa');
        $p('ZAM26002', 'LAGER Gatos Castrados',               'LAGER',          'Alimento Gatos',   'bolsa');
        $p('ZAM26003', 'KELLER Cachorro',                     'KELLER',         'Alimento Perros',  'bolsa');
        $p('ZAM26004', 'EQUILIBRIO Cachorro',                 'Equilibrio',     'Alimento Perros',  'bolsa');
        $p('ZAM26005', 'EQUILIBRIO Raza Pequeña',             'Equilibrio',     'Alimento Perros',  'bolsa');
        $p('ZAM26006', 'EQUILIBRIO Cat Adulto',               'Equilibrio',     'Alimento Gatos',   'bolsa');
        $p('ZAM26007', 'EQUILIBRIO All Breed Sabor Carne',    'Equilibrio',     'Alimento Perros',  'bolsa');
        $p('ZAM26008', 'EQUILIBRIO Gato Adulto',              'Equilibrio',     'Alimento Gatos',   'bolsa');
        $p('ZAM26009', 'EQUILIBRIO Filhotes Razas Pequeñas',  'Equilibrio',     'Alimento Perros',  'bolsa');
        $p('ZAM26010', 'FROST Puppy Mini y Small',            'Frost',          'Alimento Perros',  'bolsa');
        $p('ZAM26011', 'FROST Puppy Medium y Large',          'Frost',          'Alimento Perros',  'bolsa');
        $p('ZAM26012', 'FROST Adult Mini y Small',            'Frost',          'Alimento Perros',  'bolsa');
        $p('ZAM26013', 'FROST Senior Medium y Large',         'Frost',          'Alimento Perros',  'bolsa');
        $p('ZAM26014', 'FROST Cat Senior Sterilizado',        'Frost',          'Alimento Gatos',   'bolsa');
        $p('ZAM26015', 'FROST Sensitive Skin',                'Frost',          'Alimento Perros',  'bolsa');
        $p('ZAM26016', 'FROST Adulto LB',                     'Frost',          'Alimento Perros',  'bolsa');
        $p('ZAM26017', 'FROST Adulto SB',                     'Frost',          'Alimento Perros',  'bolsa');
        $p('ZAM26018', 'MONELLO Gatitos Salmon y Pollo',      'Monello',        'Alimento Gatos',   'bolsa');
        $p('ZAM26019', 'MONELLO Perro Mayores Pollo Arroz Remolacha', 'Monello','Alimento Perros',  'bolsa');
        $p('ZAM26020', 'MONELLO Adultos Raza Pequeña',        'Monello',        'Alimento Perros',  'bolsa');
        $p('ZAM26021', 'MONELLO Dog Cachorro Pollo',          'Monello',        'Alimento Perros',  'bolsa');
        $p('ZAM26022', 'MONELLO Perro Adulto Pollo y Carne',  'Monello',        'Alimento Perros',  'bolsa');
        $p('ZAM26023', 'VITTAMAX Gato Salmon Castrado',       'VITTAMAX',       'Alimento Gatos',   'bolsa');
        $p('ZAM26024', 'VITTAMAX Gato Pollo Castrado',        'VITTAMAX',       'Alimento Gatos',   'bolsa');
        $p('ZAM26025', 'VITTAMAX Gato Mix',                   'VITTAMAX',       'Alimento Gatos',   'bolsa');
        $p('ZAM26026', 'VITTAMAX Natural Cachorro',           'VITTAMAX',       'Alimento Perros',  'bolsa');
        $p('ZAM26027', 'VITTAMAX Gato Peixe',                 'VITTAMAX',       'Alimento Gatos',   'bolsa');
        $p('ZAM26028', 'MAXINE Adulto Razas Pequeñas',        'Maxine',         'Alimento Perros',  'bolsa');
        $p('ZAM26029', 'MAXINE Gato',                         'Maxine',         'Alimento Gatos',   'bolsa');
        $p('ZAM26030', 'MATISSE Castrados Salmao',            'Matisse',        'Alimento Gatos',   'bolsa');
        $p('ZAM26031', 'MATISSE Salmao y Arroz',              'Matisse',        'Alimento Gatos',   'bolsa');
        $p('ZAM26032', 'MATISSE Filhote',                     'Matisse',        'Alimento Perros',  'bolsa');
        $p('ZAM26033', 'PROT 21 Adultos Carne con Vegetales', 'Prot 21',        'Alimento Perros',  'bolsa');
        $p('ZAM26034', 'KONGO GOLD Adulto',                   'Kongo Gold',     'Alimento Perros',  'bolsa');
        $p('ZAM26035', 'KONGO Adulto Mediano y Grande Tradicional', 'Kongo',    'Alimento Perros',  'bolsa');
        $p('ZAM26036', 'SMART Adulto',                        'Smart',          'Alimento Perros',  'bolsa');
        $p('ZAM26037', 'PELUSA Cat Adulto',                   'Pelusa',         'Alimento Gatos',   'bolsa');
        $p('ZAM26038', 'OLD PRINCE Urinary',                  'Old Prince',     'Alimento Gatos',   'bolsa');
        $p('ZAM26039', 'OLD PRINCE Premium Adulto Pollo y Carne', 'Old Prince', 'Alimento Perros',  'bolsa');
        $p('ZAM26040', 'OLD PRINCE Adulto Cerdo y Legumbres', 'Old Prince',     'Alimento Perros',  'bolsa');
        $p('ZAM26041', 'FORMULA NATURAL Fresh Meat Control de Peso Raza Pequeña', 'Formula Natural', 'Alimento Perros', 'bolsa');
        $p('ZAM26042', 'FORMULA NATURAL Fresh Meat Cachorro Raza Pequeña',        'Formula Natural', 'Alimento Perros', 'bolsa');
        $p('ZAM26043', 'FORMULA NATURAL Fresh Meat Adulto Raza Pequeña',          'Formula Natural', 'Alimento Perros', 'bolsa');
        $p('ZAM26044', 'NERO Refeicao Perros Adultos',        'Nero',           'Alimento Perros',  'bolsa');
        $p('ZAM26045', 'NERO Cat',                            'Nero',           'Alimento Gatos',   'bolsa');
        $p('ZAM26046', 'NERO Raza Pequeña',                   'Nero',           'Alimento Perros',  'bolsa');
        $p('ZAM26047', 'VORAZ Gato Adulto',                   'Voraz',          'Alimento Gatos',   'bolsa');
        $p('ZAM26048', 'DOGUI Adulto',                        'Dogui',          'Alimento Perros',  'bolsa');
        $p('ZAM26049', 'MIKDOG Adulto',                       'Mikdog',         'Alimento Perros',  'bolsa');
        $p('ZAM26050', 'MIKDOG Adulto Premium Especial Raza Pequeña', 'Mikdog', 'Alimento Perros',  'bolsa');
        $p('ZAM26051', 'MIKDOG Adulto Razas Pequeñas',        'Mikdog',         'Alimento Perros',  'bolsa');
        $p('ZAM26052', 'ECOPET Adultos',                      'Ecopet',         'Alimento Perros',  'bolsa');
        $p('ZAM26053', 'PREMIUM Perro Adulto Cordero',        'Premium',        'Alimento Perros',  'bolsa');
        $p('ZAM26054', 'BIRBO Gatitos',                       'Birbo',          'Alimento Gatos',   'bolsa');
        $p('ZAM26055', 'BIRBO Perros Adultos Cordero y Vegetales', 'Birbo',     'Alimento Perros',  'bolsa');
        $p('ZAM26056', 'BIRBO Perros Adultos Tradicional Pollo', 'Birbo',       'Alimento Perros',  'bolsa');
        $p('ZAM26057', 'N&D Ocean Can Salmon Mediano y Grande', 'N&D',          'Alimento Perros',  'bolsa');
        $p('ZAM26058', 'MAX Performance Adulto',              'Max',            'Alimento Perros',  'bolsa');
        $p('ZAM26059', 'MAX Mature',                          'Max',            'Alimento Perros',  'bolsa');
        $p('ZAM26060', 'MAX VITA Filhote',                    'Max Vita',       'Alimento Perros',  'bolsa');
        $p('ZAM26061', 'MAX VITA Buffet',                     'Max Vita',       'Alimento Perros',  'bolsa');
        $p('ZAM26062', 'THE GOLDEN CHOICE Adulto',           'The Golden Choice','Alimento Perros', 'bolsa');
        $p('ZAM26063', 'CHARRUA Adulto',                      'Charrua',        'Alimento Perros',  'bolsa');
        $p('ZAM26064', 'CANGO Arroz Medio Grano con Vitaminas','Cango',         'Alimento Perros',  'bolsa');
        $p('ZAM26065', 'SELECT Digestion Equilibrada Raza Mediana y Grande', 'Select', 'Alimento Perros', 'bolsa');
        $p('ZAM26066', 'ORIGENS Premium Especial Raza Pequeña Light', 'Origens','Alimento Perros',  'bolsa');
        $p('ZAM26067', 'BIOFRESH Adulto Raza Pequeña',        'Biofresh',       'Alimento Perros',  'bolsa');

        // ── ALIMENTO HÚMEDO Y SNACKS ─────────────────────────────────────────
        $p('ZAM26070', 'PATE PRIMOGATO Premium Carne',        'Pate Primogato', 'Alimento Húmedo y Snacks');
        $p('ZAM26071', 'PATE PRIMOGATO Premium Filhotes',     'Pate Primogato', 'Alimento Húmedo y Snacks');
        $p('ZAM26072', 'PATE PRIMOCAO Carne',                 'Pate Primocao',  'Alimento Húmedo y Snacks');
        $p('ZAM26073', 'PATE PRIMOCAO Carne y Vegetales',     'Pate Primocao',  'Alimento Húmedo y Snacks');
        $p('ZAM26074', 'SACHET PRIMOGATO Premium Filhotes Pollo', 'Sachet Primogato', 'Alimento Húmedo y Snacks');
        $p('ZAM26075', 'SACHET PRIMOGATO Premium Carne',      'Sachet Primogato','Alimento Húmedo y Snacks');
        $p('ZAM26076', 'SACHET PRIMOGATO Premium Pescado',    'Sachet Primogato','Alimento Húmedo y Snacks');
        $p('ZAM26077', 'SACHET PRIMOCAO Premium Carne',       'Sachet Primocao','Alimento Húmedo y Snacks');
        $p('ZAM26078', 'SACHET PRIMOCAO Premium Junior Pollo','Sachet Primocao','Alimento Húmedo y Snacks');
        $p('ZAM26079', 'CREAMY SNACK Lopets Gatos Salmon',    'Creamy Snack',   'Alimento Húmedo y Snacks');
        $p('ZAM26080', 'CREAMY SNACK Lopets Gatos Atun Bonito','Creamy Snack',  'Alimento Húmedo y Snacks');
        $p('ZAM26081', 'CAT CHOW Salsa Adultos Carne',        'Cat Chow',       'Alimento Húmedo y Snacks');
        $p('ZAM26082', 'CAT CHOW Salsa Adultos Pescado',      'Cat Chow',       'Alimento Húmedo y Snacks');
        $p('ZAM26083', 'CAT CHOW Salsa Castrados de Pescado', 'Cat Chow',       'Alimento Húmedo y Snacks');
        $p('ZAM26084', 'CAT CHOW Gatitos Pollo',              'Cat Chow',       'Alimento Húmedo y Snacks');
        $p('ZAM26085', 'SALSA GRAN PLUS Perro Adulto Carne',  'Salsa Gran Plus','Alimento Húmedo y Snacks');
        $p('ZAM26086', 'SALSA GRAN PLUS Perro Adulto Pollo',  'Salsa Gran Plus','Alimento Húmedo y Snacks');
        $p('ZAM26087', 'SALSA GRAN PLUS Perro Adulto Salmon y Pollo', 'Salsa Gran Plus', 'Alimento Húmedo y Snacks');
        $p('ZAM26088', 'SALSA GRAN PLUS Filhote',             'Salsa Gran Plus','Alimento Húmedo y Snacks');
        $p('ZAM26089', 'SALSA ORIGENS Adultos Carne y Zapallo','Salsa Origens', 'Alimento Húmedo y Snacks');
        $p('ZAM26090', 'SALSA ORIGENS Filhotes Carne Pollo y Batata', 'Salsa Origens', 'Alimento Húmedo y Snacks');
        $p('ZAM26091', 'SALSA ORIGENS Adultos Raza Pequeña Pollo y Zanahoria', 'Salsa Origens', 'Alimento Húmedo y Snacks');
        $p('ZAM26092', 'SALSA ORIGENS Gato Adulto y Cachorro Carne', 'Salsa Origens', 'Alimento Húmedo y Snacks');
        $p('ZAM26093', 'SALSA ORIGENS Gato Castrado Pollo y Arroz', 'Salsa Origens', 'Alimento Húmedo y Snacks');
        $p('ZAM26094', 'FELIX Salsa Carne',                   'Felix',          'Alimento Húmedo y Snacks');
        $p('ZAM26095', 'FELIX Salsa Salmon',                  'Felix',          'Alimento Húmedo y Snacks');
        $p('ZAM26096', 'FELIX Salsa Classic Gatitos Pescado', 'Felix',          'Alimento Húmedo y Snacks');
        $p('ZAM26097', 'MIKDOG Salsa Carne Adultos',          'Mikdog',         'Alimento Húmedo y Snacks');
        $p('ZAM26098', 'FORMULA NATURAL Dog Biscuits Calabaza Coco y Quinoa', 'Formula Natural', 'Alimento Húmedo y Snacks');

        // ── ARENA SANITARIA ──────────────────────────────────────────────────
        $p('ZAM26100', 'CAT LITTER Bentonita Limon 4kg',      'Cat Litter',     'Arena Sanitaria',  'unidad', 4.0);
        $p('ZAM26101', 'CAT LITTER Bentonita Manzana 4kg',    'Cat Litter',     'Arena Sanitaria',  'unidad', 4.0);
        $p('ZAM26102', 'CAT LITTER Bentonita Cafe 4kg',       'Cat Litter',     'Arena Sanitaria',  'unidad', 4.0);
        $p('ZAM26103', 'CAT LITTER Limon 4kg',                'Cat Litter',     'Arena Sanitaria',  'unidad', 4.0);
        $p('ZAM26104', 'CAT LITTER Lavanda 4kg',              'Cat Litter',     'Arena Sanitaria',  'unidad', 4.0);
        $p('ZAM26105', 'CAT LITTER Rosas 4kg',                'Cat Litter',     'Arena Sanitaria',  'unidad', 4.0);
        $p('ZAM26106', 'PIPICAT Sanitaria Gato',              'Pipicat',        'Arena Sanitaria');

        // ── ALIMENTO AVES Y GRANJA ───────────────────────────────────────────
        $p('ZAM26110', 'RAVAL Parrillero Terminador Engorde Pollo 25kg', 'Raval', 'Alimento Aves y Granja', 'bolsa', 25.0);
        $p('ZAM26111', 'EQUILIBRIO All Breed Sabor Carne (Aves)', 'Equilibrio',  'Alimento Aves y Granja', 'bolsa');
        $p('ZAM26112', 'RI-MART Girasol Grande 25kg',         'Ri-Mar',         'Alimento Aves y Granja', 'bolsa', 25.0);
        $p('ZAM26113', 'RI-MART Monte 25kg',                  'Ri-Mar',         'Alimento Aves y Granja', 'bolsa', 25.0);
        $p('ZAM26114', 'RI-MART Trigo 25kg',                  'Ri-Mar',         'Alimento Aves y Granja', 'bolsa', 25.0);
        $p('ZAM26115', 'RI-MART Avena 25kg',                  'Ri-Mar',         'Alimento Aves y Granja', 'bolsa', 25.0);
        $p('ZAM26116', 'SAN JOSE Polenta 25kg',               'San José',       'Alimento Aves y Granja', 'bolsa', 25.0);
        $p('ZAM26117', 'MOLINO STA. ROSA Harina de Maiz Polenta', 'Molino Sta. Rosa', 'Alimento Aves y Granja', 'bolsa');
        $p('ZAM26118', 'PALITOS de Cereales Colores kg',       null,             'Alimento Aves y Granja', 'kg');

        // ── ANTIPARASITARIOS ─────────────────────────────────────────────────
        $p('ZAM26120', 'NEXGARD 2 a 4 KG',                   'Nexgard',        'Antiparasitarios');
        $p('ZAM26121', 'NEXGARD 25.1 a 50 KG',               'Nexgard',        'Antiparasitarios');
        $p('ZAM26122', 'NEXGARD SPECTRA 3.6 a 7.5 KG',       'Nexgard Spectra','Antiparasitarios');
        $p('ZAM26123', 'NEXGARD SPECTRA 7.6 a 15 KG',        'Nexgard Spectra','Antiparasitarios');
        $p('ZAM26124', 'NEXGARD SPECTRA 15.1 a 30 KG',       'Nexgard Spectra','Antiparasitarios');
        $p('ZAM26125', 'NEXGARD SPECTRA 30.1 a 60 KG',       'Nexgard Spectra','Antiparasitarios');
        $p('ZAM26126', 'REVOLUTION Gato 2.6 a 7.5 kg Desparasitante', 'Revolution', 'Antiparasitarios');
        $p('ZAM26127', 'DOMINAL PIPETA Gato hasta 4 kg',     'Dominal Pipeta', 'Antiparasitarios');
        $p('ZAM26128', 'DOMINAL PIPETA Gato mas de 4 kg',    'Dominal Pipeta', 'Antiparasitarios');
        $p('ZAM26129', 'DOMINAL PIPETA Perro hasta 5 kg',    'Dominal Pipeta', 'Antiparasitarios');
        $p('ZAM26130', 'DOMINAL PIPETA Perro 5.1 a 10 kg',   'Dominal Pipeta', 'Antiparasitarios');
        $p('ZAM26131', 'DOMINAL PIPETA Perro 10.1 a 25 kg',  'Dominal Pipeta', 'Antiparasitarios');
        $p('ZAM26132', 'DOMINAL PIPETA Perro 25.1 a 40 kg',  'Dominal Pipeta', 'Antiparasitarios');
        $p('ZAM26133', 'DOMINAL PIPETA Perro mas de 40 kg',  'Dominal Pipeta', 'Antiparasitarios');
        $p('ZAM26134', 'DOMINAL PIPETA MAX Perro 5.1 a 10 kg','Dominal Pipeta Max', 'Antiparasitarios');
        $p('ZAM26135', 'DOMINAL PIPETA MAX Perro 25.1 a 40 kg','Dominal Pipeta Max', 'Antiparasitarios');
        $p('ZAM26136', 'DOMINAL PIPETA MAX Perro mas de 40 kg','Dominal Pipeta Max', 'Antiparasitarios');
        $p('ZAM26137', 'NEOCIDOL Garrapaticida Pulgicida Sarnicida', 'Neocidol','Antiparasitarios');
        $p('ZAM26138', 'APPRYL Caja por 240 Comprimidos',    'Appryl',         'Antiparasitarios');
        $p('ZAM26139', 'SUPRALINE Comprimidos Antiparasitario Gato', 'Supraline','Antiparasitarios');
        $p('ZAM26140', 'PREVICOX 227mg 30 Comprimidos',      'Previcox',       'Medicamentos');
        $p('ZAM26141', 'VITALFLEX 30 Comprimidos',           'Vitalflex',      'Medicamentos');

        // ── HIGIENE Y BELLEZA ────────────────────────────────────────────────
        $p('ZAM26150', 'PROCAO Shampoo Citronela 500ml',     'Procao',         'Higiene y Belleza');
        $p('ZAM26151', 'PROCAO Shampoo Cachorros 500ml',     'Procao',         'Higiene y Belleza');
        $p('ZAM26152', 'PROCAO Shampoo Pelo Negro 500ml',    'Procao',         'Higiene y Belleza');
        $p('ZAM26153', 'PROCAO Shampoo y Acondicionador 500ml', 'Procao',      'Higiene y Belleza');
        $p('ZAM26154', 'PROCAO Shampoo y Acondicionador Erba de Sta. Maria 500ml', 'Procao', 'Higiene y Belleza');
        $p('ZAM26155', 'PROCAO Limpia Pata',                 'Procao',         'Higiene y Belleza');
        $p('ZAM26156', 'PROCAO Shampoo Clorexidina',         'Procao',         'Higiene y Belleza');
        $p('ZAM26157', 'UP CLEAN Shampoo Cachorro 750ml',    'Up Clean',       'Higiene y Belleza');
        $p('ZAM26158', 'UP CLEAN Baño Seco Gato',            'Up Clean',       'Higiene y Belleza');
        $p('ZAM26159', 'UP CLEAN Colonias x28 + Muestras',   'Up Clean',       'Higiene y Belleza');
        $p('ZAM26160', 'DOMINAL SHAMPOO Pulgas y Garrapatas 250ml', 'Dominal Shampoo', 'Higiene y Belleza');
        $p('ZAM26161', 'VETYS Spray para No Lamidas y Mordidas', 'Vetys',      'Higiene y Belleza');
        $p('ZAM26162', 'CURAMIC AG Plata Microsules 290g',   'Curamic',        'Higiene y Belleza');
        $p('ZAM26163', 'BAÑO SECO Espuma Yoji',              null,             'Higiene y Belleza');
        $p('ZAM26164', 'TOALLITAS HUMEDAS para Ojos x120',   null,             'Higiene y Belleza');
        $p('ZAM26165', 'DENTAL Care Set 4 Piezas',           'Dental',         'Higiene y Belleza');

        // ── CONTROL DE PLAGAS ────────────────────────────────────────────────
        $p('ZAM26170', 'JIMO Hormigas Polvo Talquera',       'Jimo',           'Control de Plagas');
        $p('ZAM26171', 'JIMO Mata Baratas Gas',              'Jimo',           'Control de Plagas');
        $p('ZAM26172', 'JIMO Gas 2 Tubos',                   'Jimo',           'Control de Plagas');
        $p('ZAM26173', 'JIMO Anti-Insect Aerosol',           'Jimo',           'Control de Plagas');
        $p('ZAM26174', 'JIMO Anti-Insect Seco Aerosol',      'Jimo',           'Control de Plagas');
        $p('ZAM26175', 'JIMO Raicida Granulado',             'Jimo',           'Control de Plagas');
        $p('ZAM26176', 'FLIT Fumiciper',                     'Flit',           'Control de Plagas');
        $p('ZAM26177', 'STORM Raticida y Rodenticida',       'Storm',          'Control de Plagas');
        $p('ZAM26178', 'TALCOBAL Talco Pulgicida',           'Talcobal',       'Control de Plagas');
        $p('ZAM26179', 'LAMPO Granulado',                    'Lampo',          'Control de Plagas');
        $p('ZAM26180', 'DR. CARACOL Caracolicida',           'Dr. Caracol',    'Control de Plagas');
        $p('ZAM26181', 'RATICIDA Mouse Trap Pega-Pega',      null,             'Control de Plagas');
        $p('ZAM26182', 'MATA CUCARACHAS Gel Jeringa',        null,             'Control de Plagas');
        $p('ZAM26183', 'BIOCLIN Graseras y Desagues',        'Bioclin',        'Control de Plagas');
        $p('ZAM26184', 'BIOCLIN Pozos Negros y Camaras Septicas', 'Bioclin',   'Control de Plagas');
        $p('ZAM26185', 'CREOLINA Concentrada 1 Litro',       null,             'Control de Plagas');

        // ── COLLARES ─────────────────────────────────────────────────────────
        $p('ZAM26200', 'DOMINAL COLLAR para Perro Chico y Cachorro', 'Dominal Collar', 'Collares');
        $p('ZAM26201', 'DOMINAL COLLAR para Perro Mediano',  'Dominal Collar', 'Collares');
        $p('ZAM26202', 'DOMINAL COLLAR para Perro Grande',   'Dominal Collar', 'Collares');
        $p('ZAM26203', 'DOMINAL COLLAR para Perro Extra Grande', 'Dominal Collar', 'Collares');
        $p('ZAM26204', 'DOMINAL COLLAR Gato',                'Dominal Collar', 'Collares');
        $p('ZAM26205', 'COLLAR Cinta N°3',                   null,             'Collares');
        $p('ZAM26206', 'COLLAR Cinta N°4',                   null,             'Collares');
        $p('ZAM26207', 'COLLAR Reforzado Chico',             null,             'Collares');
        $p('ZAM26208', 'COLLAR Reforzado Grande',            null,             'Collares');
        $p('ZAM26209', 'COLLAR Reforzado Chico con Destorcedor', null,         'Collares');
        $p('ZAM26210', 'COLLAR Reforzado Grande con Destorcedor', null,        'Collares');
        $p('ZAM26211', 'COLLAR Figuras M',                   null,             'Collares');
        $p('ZAM26212', 'COLLAR Diseño Lili M',               null,             'Collares');
        $p('ZAM26213', 'COLLAR Diseño Lili S',               null,             'Collares');
        $p('ZAM26214', 'COLLAR por 6 Silicona Varios Diseños', null,           'Collares');
        $p('ZAM26215', 'COLLAR por 12 Brillos con Corazon',  null,             'Collares');
        $p('ZAM26216', 'COLLAR por 12 Estrellas',            null,             'Collares');
        $p('ZAM26217', 'COLLAR por 12 Bandana',              null,             'Collares');
        $p('ZAM26218', 'COLLAR por 12 Gato Reflectivo',      null,             'Collares');
        $p('ZAM26219', 'COLLAR Bandana N°3',                 null,             'Collares');
        $p('ZAM26220', 'COLLAR de Ahorque Perro Dorado 2mm x40cm', null,       'Collares');
        $p('ZAM26221', 'COLLAR de Ahorque Perro Dorado 2.5mm x45cm', null,     'Collares');
        $p('ZAM26222', 'COLLAR de Ahorque Perro Dorado 3mm x50cm', 'Zamoritos','Collares');
        $p('ZAM26223', 'COLLAR de Ahorque Perro 3mm x60cm',  null,             'Collares');
        $p('ZAM26224', 'COLLAR de Ahorque Dorado 4x60',      null,             'Collares');
        $p('ZAM26225', 'COLLAR de Ahorque Dorado 4.5x70',    null,             'Collares');
        $p('ZAM26226', 'COLLAR de Ahorque Dorado 5x80',      null,             'Collares');
        $p('ZAM26227', 'COLLAR de Ahorque Perro 5mm x80cm',  null,             'Collares');
        $p('ZAM26228', 'COLLAR Isabelino N°1',               null,             'Collares');
        $p('ZAM26229', 'COLLAR Isabelino N°1+ Mas Grande',   null,             'Collares');
        $p('ZAM26230', 'COLLAR Isabelino N°2',               null,             'Collares');
        $p('ZAM26231', 'COLLAR Isabelino N°2+',              null,             'Collares');
        $p('ZAM26232', 'COLLAR Isabelino N°3',               null,             'Collares');
        $p('ZAM26233', 'COLLAR Isabelino N°4',               null,             'Collares');
        $p('ZAM26234', 'COLLAR Isabelino N°5',               null,             'Collares');
        $p('ZAM26235', 'COLLAR Isabelino N°6',               null,             'Collares');
        $p('ZAM26236', 'COLLAR Isabelino N°7 Mas Chico',     null,             'Collares');
        $p('ZAM26237', 'CADENA Atar Tipo Victor 20 Chica',   null,             'Collares');
        $p('ZAM26238', 'CADENA Atar Tipo Victor 35 Mediana', null,             'Collares');
        $p('ZAM26239', 'CADENA Atar Tipo Victor 45 Grande',  null,             'Collares');
        $p('ZAM26240', 'CADENA de Paseo Perro 4mm x100cm',   null,             'Collares');

        // ── CORREAS Y ARNESES ────────────────────────────────────────────────
        $p('ZAM26250', 'CORREA Pixel 6mm Chica',             null,             'Correas y Arneses');
        $p('ZAM26251', 'CORREA Pixel 8mm Mediana',           null,             'Correas y Arneses');
        $p('ZAM26252', 'CORREA Pixel 12mm Grande',           null,             'Correas y Arneses');
        $p('ZAM26253', 'CORREA con Mango de Goma',           null,             'Correas y Arneses');
        $p('ZAM26254', 'CORREA Hello Pet L',                 null,             'Correas y Arneses');
        $p('ZAM26255', 'CORREA Doble Agarre',                null,             'Correas y Arneses');
        $p('ZAM26256', 'CORREA Extensible Blister 5mts',     null,             'Correas y Arneses');
        $p('ZAM26257', 'CORREA Cinta Mosqueton Simple N°2',  null,             'Correas y Arneses');
        $p('ZAM26258', 'ARNES Regulable S Therapy',          null,             'Correas y Arneses');
        $p('ZAM26259', 'ARNES Regulable L Therapy',          null,             'Correas y Arneses');
        $p('ZAM26260', 'ARNES Regulable XL Therapy',         null,             'Correas y Arneses');
        $p('ZAM26261', 'ARNES Regulable XXL Therapy',        null,             'Correas y Arneses');
        $p('ZAM26262', 'ARNES Pechera Lili',                 null,             'Correas y Arneses');
        $p('ZAM26263', 'ARNES Malla Lili M',                 null,             'Correas y Arneses');
        $p('ZAM26264', 'ARNES Neopreno M',                   null,             'Correas y Arneses');
        $p('ZAM26265', 'ARNES Reflectivo Doble Enganche M',  null,             'Correas y Arneses');
        $p('ZAM26266', 'ARNES Reflectivo Doble Enganche XL', null,             'Correas y Arneses');
        $p('ZAM26267', 'ARNES Smoking Lili S',               null,             'Correas y Arneses');
        $p('ZAM26268', 'ARNES Conejo Talle L',               null,             'Correas y Arneses');
        $p('ZAM26269', 'PRETAL Pastel Chico',                null,             'Correas y Arneses');
        $p('ZAM26270', 'PRETAL Pastel Mediano',              null,             'Correas y Arneses');
        $p('ZAM26271', 'PRETAL Pastel Grande',               null,             'Correas y Arneses');
        $p('ZAM26272', 'PRETAL Ingles Diseño M',             null,             'Correas y Arneses');
        $p('ZAM26273', 'PRETAL Ingles Diseño S',             null,             'Correas y Arneses');
        $p('ZAM26274', 'PRETAL Estrella Chico',              null,             'Correas y Arneses');
        $p('ZAM26275', 'PRETAL Estrella Grande',             null,             'Correas y Arneses');
        $p('ZAM26276', 'PRETAL para Gato Lili',              null,             'Correas y Arneses');
        $p('ZAM26277', 'BOZAL Tela Lili Talle XL',          null,             'Correas y Arneses');
        $p('ZAM26278', 'BOZAL Cuero Reforzado M',            null,             'Correas y Arneses');
        $p('ZAM26279', 'BOZAL Cuero Reforzado XL',          null,             'Correas y Arneses');
        $p('ZAM26280', 'BOZAL Sativa N°1',                  null,             'Correas y Arneses');
        $p('ZAM26281', 'BOZAL Sativa N°3',                  null,             'Correas y Arneses');
        $p('ZAM26282', 'BOZAL Sativa N°5',                  null,             'Correas y Arneses');
        $p('ZAM26283', 'MOSQUETON Nacional 40mm',            null,             'Correas y Arneses');
        $p('ZAM26284', 'MOSQUETON Nacional 60mm',            null,             'Correas y Arneses');
        $p('ZAM26285', 'MOSQUETON Nacional 70mm',            null,             'Correas y Arneses');
        $p('ZAM26286', 'MOSQUETON Nacional 80mm',            null,             'Correas y Arneses');
        $p('ZAM26287', 'MOSQUETON Nacional 90mm',            null,             'Correas y Arneses');
        $p('ZAM26288', 'MOSQUETON Nacional 110mm',           null,             'Correas y Arneses');
        $p('ZAM26289', 'MOSQUETON con Rosca 60mm',           null,             'Correas y Arneses');
        $p('ZAM26290', 'MOSQUETON con Rosca 100mm',          null,             'Correas y Arneses');
        $p('ZAM26291', 'MOSQUETON Ovalado 60mm',             null,             'Correas y Arneses');
        $p('ZAM26292', 'MOSQUETON Ovalado 80mm',             null,             'Correas y Arneses');
        $p('ZAM26293', 'MOSQUETON Automatico 60 con Destorcedor', null,        'Correas y Arneses');
        $p('ZAM26294', 'MOSQUETON Automatico 80 con Destorcedor', null,        'Correas y Arneses');
        $p('ZAM26295', 'MOSQUETON Automatico 100 con Destorcedor', null,       'Correas y Arneses');
        $p('ZAM26296', 'DESTORCEDOR Nacional 60mm',          null,             'Correas y Arneses');
        $p('ZAM26297', 'DESTORCEDOR Nacional 80mm',          null,             'Correas y Arneses');
        $p('ZAM26298', 'DESTORCEDOR Nacional 90mm',          null,             'Correas y Arneses');

        // ── COMEDEROS Y BEBEDEROS ────────────────────────────────────────────
        $p('ZAM26300', 'PLATO Plastico Gato Alto',           null,             'Comederos y Bebederos');
        $p('ZAM26301', 'PLATO Simple Menplast N°2',          null,             'Comederos y Bebederos');
        $p('ZAM26302', 'PLATO Simple Menplast N°3',          null,             'Comederos y Bebederos');
        $p('ZAM26303', 'PLATO con Botella Anti Hormigas',    null,             'Comederos y Bebederos');
        $p('ZAM26304', 'PLATO Acero Inox 10cm',             null,             'Comederos y Bebederos');
        $p('ZAM26305', 'PLATO Cara Gato Grande',             null,             'Comederos y Bebederos');
        $p('ZAM26306', 'PLATO Cara de Gato Doble',          null,             'Comederos y Bebederos');
        $p('ZAM26307', 'PLATO Cara de Gato Inclinado',      null,             'Comederos y Bebederos');
        $p('ZAM26308', 'PLATO Doble Chico',                  null,             'Comederos y Bebederos');
        $p('ZAM26309', 'PLATO Doble Pastel Mediano',         null,             'Comederos y Bebederos');
        $p('ZAM26310', 'PLATO Bebedero con Botella Cara Gato', null,           'Comederos y Bebederos');
        $p('ZAM26311', 'COMEDERO Ave 2 Agujeros con Gancho', null,             'Comederos y Bebederos');
        $p('ZAM26312', 'BEBEDERO Ave Largo',                 null,             'Comederos y Bebederos');
        $p('ZAM26313', 'BEBEDERO Picaflor Simple 220ml',     null,             'Comederos y Bebederos');
        $p('ZAM26314', 'BEBEDERO de Picaflor Maximo Simple', null,             'Comederos y Bebederos');
        $p('ZAM26315', 'BEBEDERO con Botella',               null,             'Comederos y Bebederos');
        $p('ZAM26316', 'BEBEDERO con Soporte 500ml',         null,             'Comederos y Bebederos');
        $p('ZAM26317', 'BEBEDERO Dispensador',               null,             'Comederos y Bebederos');
        $p('ZAM26318', 'BEBEDERO Fuente Eco Cuadrada Electrica', null,         'Comederos y Bebederos');
        $p('ZAM26319', 'BEBEDERO Fuente Canilla Electrica',  null,             'Comederos y Bebederos');
        $p('ZAM26320', 'BEBEDERO Fuente Electrica Doble con Dispensador', null,'Comederos y Bebederos');
        $p('ZAM26321', 'BEBEDERO Conejo',                    null,             'Comederos y Bebederos');
        $p('ZAM26322', 'CONTENEDOR Racion Blanco',           null,             'Comederos y Bebederos');

        // ── BANDEJAS Y ACCESORIOS SANITARIOS ────────────────────────────────
        $p('ZAM26330', 'BANDEJA Sanitaria Gato',             null,             'Bandejas y Accesorios Sanitarios');
        $p('ZAM26331', 'BANDEJA Sanitaria Alta con Pala',    null,             'Bandejas y Accesorios Sanitarios');
        $p('ZAM26332', 'BANDEJA Gato Murano',                null,             'Bandejas y Accesorios Sanitarios');
        $p('ZAM26333', 'BANDEJA Simple Ornamental',          null,             'Bandejas y Accesorios Sanitarios');
        $p('ZAM26334', 'SANITARIO Cerrado con Bandeja',      null,             'Bandejas y Accesorios Sanitarios');
        $p('ZAM26335', 'PALA Sanitaria Chiquita',            null,             'Bandejas y Accesorios Sanitarios');
        $p('ZAM26336', 'PALA Sanitaria Mango Gatito',        null,             'Bandejas y Accesorios Sanitarios');
        $p('ZAM26337', 'PALA Sanitaria Gato Profunda',       null,             'Bandejas y Accesorios Sanitarios');
        $p('ZAM26338', 'PALA Sanitaria Grande',              null,             'Bandejas y Accesorios Sanitarios');

        // ── CAMAS Y DESCANSO ─────────────────────────────────────────────────
        $p('ZAM26340', 'CAMA Redonda Pelos S 40cm',         null,             'Camas y Descanso');
        $p('ZAM26341', 'CAMA Brillante a la Noche',         null,             'Camas y Descanso');
        $p('ZAM26342', 'CAMA Plastico Gato mas Juguete',    null,             'Camas y Descanso');
        $p('ZAM26343', 'CAMA Rectangular Ohana S',          null,             'Camas y Descanso');
        $p('ZAM26344', 'COLCHONETA con Almohada S',         null,             'Camas y Descanso');
        $p('ZAM26345', 'MOCHILA Cara de Gato',              null,             'Transporte');
        $p('ZAM26346', 'JAULA Pajaro Domo Chico',           null,             'Transporte');
        $p('ZAM26347', 'JAULA Pajaro Rectangular Simple',   null,             'Transporte');
        $p('ZAM26348', 'JAULA Pajaro Techo Curvo',          null,             'Transporte');

        // ── JUGUETES ─────────────────────────────────────────────────────────
        $p('ZAM26350', 'JUGUETE Peluche Cactus',            null,             'Juguetes');
        $p('ZAM26351', 'JUGUETE Pelota Escamas Grande',     null,             'Juguetes');
        $p('ZAM26352', 'JUGUETE Pelota Corazon y Hueso',    null,             'Juguetes');
        $p('ZAM26353', 'JUGUETE Pelota Maciza Roja 6cm',    null,             'Juguetes');
        $p('ZAM26354', 'JUGUETE Pelota Maciza Roja 8.5cm',  null,             'Juguetes');
        $p('ZAM26355', 'JUGUETE Pelota Cascabel Tricolor',  null,             'Juguetes');
        $p('ZAM26356', 'JUGUETE Cuerda Mancuerna Puntitos', null,             'Juguetes');
        $p('ZAM26357', 'JUGUETE Cuerda Mancuerna Grande',   null,             'Juguetes');
        $p('ZAM26358', 'JUGUETE Cuerda Doble Grande',       null,             'Juguetes');
        $p('ZAM26359', 'JUGUETE Cuerda Grande',             null,             'Juguetes');
        $p('ZAM26360', 'JUGUETE Cuerda Enlazados',          null,             'Juguetes');
        $p('ZAM26361', 'JUGUETE Cuerda + Accesorio de Goma', null,            'Juguetes');
        $p('ZAM26362', 'JUGUETE Mordillo Triple Gigante',   null,             'Juguetes');
        $p('ZAM26363', 'JUGUETE Fresbi Goma Grande',        null,             'Juguetes');
        $p('ZAM26364', 'JUGUETE Boomerang Macizo Pastel',   null,             'Juguetes');
        $p('ZAM26365', 'JUGUETE Hueso Multisonido Gigwi',   null,             'Juguetes');
        $p('ZAM26366', 'JUGUETE Peluche Leon Multi Agarre Gigwi', null,       'Juguetes');
        $p('ZAM26367', 'JUGUETE Peluche Rayas',             null,             'Juguetes');
        $p('ZAM26368', 'JUGUETE Peluche Pizza',             null,             'Juguetes');
        $p('ZAM26369', 'JUGUETE Pack de 3 Pelotas',         null,             'Juguetes');
        $p('ZAM26370', 'JUGUETE Gato Esfera con Raton',     null,             'Juguetes');
        $p('ZAM26371', 'JUGUETE Gato Raton Cuerda Peluche', null,             'Juguetes');
        $p('ZAM26372', 'JUGUETE Gato Raton Alpillera',      null,             'Juguetes');
        $p('ZAM26373', 'JUGUETE Gato Raton Cola Bicolor',   null,             'Juguetes');
        $p('ZAM26374', 'JUGUETE Gato Raton por 12',         null,             'Juguetes');
        $p('ZAM26375', 'JUGUETE Gato Vara Pelotas a Rayas', null,             'Juguetes');
        $p('ZAM26376', 'JUGUETE Gato Vara Peluche Redondo', null,             'Juguetes');
        $p('ZAM26377', 'JUGUETE Gato 3 Pisos',              null,             'Juguetes');
        $p('ZAM26378', 'JUGUETE Gato Tortuga con Movimiento', null,           'Juguetes');
        $p('ZAM26379', 'JUGUETE Gato Pulpo Peluche',        null,             'Juguetes');
        $p('ZAM26380', 'JUGUETE Gato Raton Equilibrista',   null,             'Juguetes');
        $p('ZAM26381', 'JUGUETE Higiene Horqueta',          null,             'Juguetes');
        $p('ZAM26382', 'JUGUETE Higiene Hueso Curvo',       null,             'Juguetes');
        $p('ZAM26383', 'PAWISE Fun Plus por 24',            'Pawise',         'Juguetes');
        $p('ZAM26384', 'KIT PASTO Rectangular',             null,             'Juguetes');
        $p('ZAM26385', 'VIRUTA Hamster Cuises y Conejo',    null,             'Juguetes');

        // ── PEINES Y GROOMING ────────────────────────────────────────────────
        $p('ZAM26390', 'PEINE con Expulsador Clean',        null,             'Peines y Grooming');
        $p('ZAM26391', 'PEINE Acero Deslanador Doble Grande', null,           'Peines y Grooming');
        $p('ZAM26392', 'PEINE Cardina Chica',               null,             'Peines y Grooming');
        $p('ZAM26393', 'PEINE Cardina Grande',              null,             'Peines y Grooming');
        $p('ZAM26394', 'PEINE Cardina Colores Chica',       null,             'Peines y Grooming');
        $p('ZAM26395', 'PEINE Cardina Colores Mediana',     null,             'Peines y Grooming');
        $p('ZAM26396', 'PEINE Cardina con Expulsor',        null,             'Peines y Grooming');
        $p('ZAM26397', 'PEINE Cardina Mango Madera S',      null,             'Peines y Grooming');
        $p('ZAM26398', 'PEINE Cardina Plastico S Negro',    null,             'Peines y Grooming');
        $p('ZAM26399', 'PEINE con Expulsor Ovalado Fino',   null,             'Peines y Grooming');
        $p('ZAM26400', 'PEINE con Expulsor Ovalado Grueso', null,             'Peines y Grooming');
        $p('ZAM26401', 'PEINE con Expulsor Rectangular Fino', null,           'Peines y Grooming');
        $p('ZAM26402', 'PEINE Huella Fino con Expulsador',  null,             'Peines y Grooming');
        $p('ZAM26403', 'PEINE Madera Doble S',              null,             'Peines y Grooming');
        $p('ZAM26404', 'PEINE Masajeador para Baño',        null,             'Peines y Grooming');
        $p('ZAM26405', 'PEINE Masaje Diseño Panda',         null,             'Peines y Grooming');
        $p('ZAM26406', 'PEINE Vapor Mascotas',              null,             'Peines y Grooming');
        $p('ZAM26407', 'CEPILLO Removedor de Pelos Gato',   null,             'Peines y Grooming');
        $p('ZAM26408', 'CORTA UÑAS mas Lima Grande',        null,             'Peines y Grooming');
        $p('ZAM26409', 'CORTA UÑAS mas Lima con Agarre Chico', null,          'Peines y Grooming');
        $p('ZAM26410', 'RODILLO Manito mas Repuesto',       null,             'Peines y Grooming');
        $p('ZAM26411', 'RODILLO Saca Pelusa Chomchom',      null,             'Peines y Grooming');
        $p('ZAM26412', 'RODILLO Saca Pelusa Cdeonet',       null,             'Peines y Grooming');
        $p('ZAM26413', 'PERFUME Mascota Limon',             null,             'Peines y Grooming');
        $p('ZAM26414', 'PERFUME Mascota Manzana Roja',      null,             'Peines y Grooming');
        $p('ZAM26415', 'PERFUMADOR Donas',                  null,             'Peines y Grooming');

        // ── ACCESORIOS VARIOS ────────────────────────────────────────────────
        $p('ZAM26420', 'HUESO DE LONJA 2-3 Pulgadas',       null,             'Accesorios Varios');
        $p('ZAM26421', 'HUESO DE LONJA 5-6 Pulgadas',       null,             'Accesorios Varios');
        $p('ZAM26422', 'HUESO NATURAL 6-7 Pulgadas',        null,             'Accesorios Varios');
        $p('ZAM26423', 'HUESO NATURAL 8-9 Pulgadas',        null,             'Accesorios Varios');
        $p('ZAM26424', 'PALITO Fino de Colageno 5-8 Pulgadas x125', null,     'Accesorios Varios');
        $p('ZAM26425', 'PECES Pellets 40% Proteina 1.8mm',  null,             'Accesorios Varios');
        $p('ZAM26426', 'PECES Escamas',                     null,             'Accesorios Varios');
        $p('ZAM26427', 'BOLSAS por 6',                      null,             'Accesorios Varios');
        $p('ZAM26428', 'PAÑALES Dr. Pads 90x60 30 Unidades', null,            'Accesorios Varios');
        $p('ZAM26429', 'MATE Madera 2 Atala',               null,             'Accesorios Varios');
        $p('ZAM26430', 'RASCADOR Gato',                     null,             'Rascadores');

        // ── ROPA PARA MASCOTAS ───────────────────────────────────────────────
        $p('ZAM26440', 'ROPA Algodon Talle L',              null,             'Ropa para Mascotas');

        // ── ARTÍCULOS DEL HOGAR Y JARDÍN ────────────────────────────────────
        $p('ZAM26450', 'ARROZ Entero',                      null,             'Artículos del Hogar y Jardín');
        $p('ZAM26451', 'BIO BOTANICA Turba Abonada',        'Bio Botanica',   'Artículos del Hogar y Jardín');
        $p('ZAM26452', 'BIO BOTANICA Fertilizante 15-15-15','Bio Botanica',   'Artículos del Hogar y Jardín');

        $this->command->info('ZamoritorsCatalogoSeeder: ' . Producto::whereRaw("codigo_barras LIKE 'ZAM26%'")->count() . ' productos Zamoritos en el sistema.');
    }
}
