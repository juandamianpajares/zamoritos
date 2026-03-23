<?php

namespace Database\Seeders;

use App\Models\Marca;
use Illuminate\Database\Seeder;

class MarcaSeeder extends Seeder
{
    public function run(): void
    {
        $marcas = [
            'PATE PRIMOCAO',
            'BIRBO',
            'FELIX',
            'VORAZ',
            'NERO',
            'RI-MART',
            'EXCELLENT',
            'SELECT',
            'PREVICOX',
            'DOMINAL PIPETA MAX',
            'CANGO',
            'ORIGENS',
            'MOLINO STA. ROSA',
            'DOGUI',
            'DOG CHOW',
            'MAX',
            'TALCOBAL',
            'VITALFLEX',
            'STORM',
            'KONGO',
            'THE GOLDEN CHOICE',
            'VETYS',
            'MAGNUS',
            'BIOFRESH',
            'PEDIGREE',
            'ECOPET',
            'N&D',
            'PREMIUM',
            'BIO BOTANICA',
            'PAWISE',
            'DENTAL',
            'PIPICAT',
            'LAMPO',
            'DR. CARACOL',
            'CHARRUA',
            'ZAMORITOS',
            'GENERICO',
        ];

        foreach ($marcas as $nombre) {
            Marca::firstOrCreate(['nombre' => $nombre]);
        }
    }
}
