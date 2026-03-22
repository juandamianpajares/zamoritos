<?php

namespace Database\Seeders;

use App\Models\Marca;
use Illuminate\Database\Seeder;

class MarcaSeeder extends Seeder
{
    public function run(): void
    {
        $marcas = [
            'VITTAMAX', 'CAT LITTER', 'MONELLO', 'FORMULA NATURAL', 'KELLER',
            'EQUILIBRIO', 'RI-MAR', 'LAGER', 'FROST', 'NEOCIDOL',
            'DOMINAL PIPETA', 'SAN JOSE', 'DOMINAL SHAMPOO', 'PATE PRIMOGATO',
            'MAXINE', 'PRIMOCAO', 'MATISSE', 'REX', 'REALCAN', 'PROCAO',
            'PROT 21', 'KONGO GOLD', 'NEXGARD', 'NEXGARD SPECTRA', 'CRIOLLA',
            'OLD PRINCE', 'NATURAL DOG', 'REVOLUTION', 'PRIMOGATO', 'APPRYL',
            'RAVAL', 'JIMO', 'CAT CHOW', 'SACHET PRIMOGATO', 'FORTACHON',
            'CREAMY SNACK', 'SALSA GRAN PLUS', 'MAX VITA', 'AGRITEC',
            'SALSA ORIGENS', 'DOMINAL COLLAR', 'UP CLEAN', 'SMART', 'PELUSA',
            'SACHET PRIMOCAO', 'CURAMIC', 'MIKDOG', 'SUPRALINE', 'BIOCLIN',
            'CONNIE', 'ASTRO', 'ORGANICAT', 'PATE PRIMOCAO', 'BIRBO', 'FELIX',
            'VORAZ', 'NERO', 'RI-MART', 'EXCELLENT', 'SELECT', 'PREVICOX',
            'DOMINAL PIPETA MAX', 'CANGO', 'ORIGENS', 'MOLINO STA. ROSA',
            'DOGUI', 'DOG CHOW', 'MAX',
        ];

        foreach ($marcas as $nombre) {
            Marca::firstOrCreate(['nombre' => $nombre]);
        }
    }
}
