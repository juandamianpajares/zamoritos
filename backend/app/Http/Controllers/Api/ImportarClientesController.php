<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ImportarClientesController extends Controller
{
    /**
     * Importa clientes desde CSV.
     * Columnas esperadas (primera fila = cabeceras, insensible a mayúsculas/espacios):
     *   nombre, telefono, direccion, notas
     * La columna "codigo" es opcional; si no viene o está vacía se auto-genera.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $path  = $request->file('archivo')->getRealPath();
        $lines = array_map('str_getcsv', file($path));

        if (count($lines) < 2) {
            return response()->json(['error' => 'El archivo está vacío.'], 422);
        }

        // Normalizar cabeceras
        $headers = array_map(fn($h) => mb_strtolower(trim($h)), $lines[0]);

        $col = fn(string $name) => array_search($name, $headers, true);

        $iNombre    = $col('nombre');
        $iTelefono  = $col('telefono');
        $iDireccion = $col('direccion');
        $iNotas     = $col('notas');
        $iCodigo    = $col('codigo');

        if ($iNombre === false) {
            return response()->json(['error' => 'Columna "nombre" no encontrada.'], 422);
        }

        $creados      = 0;
        $actualizados = 0;
        $omitidos     = 0;
        $errores      = [];

        DB::beginTransaction();
        try {
            foreach (array_slice($lines, 1) as $i => $row) {
                $nombre = trim($row[$iNombre] ?? '');
                if ($nombre === '') { $omitidos++; continue; }

                $telefono  = $iTelefono  !== false ? (trim($row[$iTelefono]  ?? '') ?: null) : null;
                $direccion = $iDireccion !== false ? (trim($row[$iDireccion] ?? '') ?: null) : null;
                $notas     = $iNotas     !== false ? (trim($row[$iNotas]     ?? '') ?: null) : null;
                $codigo    = $iCodigo    !== false ? trim($row[$iCodigo]    ?? '') : '';

                // Buscar existente por código → por teléfono → nuevo
                $existente = null;

                if ($codigo !== '') {
                    $existente = Cliente::where('codigo', $codigo)->first();
                }

                if (!$existente && $telefono) {
                    $existente = Cliente::where('telefono', $telefono)->first();
                }

                if ($existente) {
                    $existente->update([
                        'nombre'    => $nombre,
                        'telefono'  => $telefono,
                        'direccion' => $direccion,
                        'notas'     => $notas,
                    ]);
                    $actualizados++;
                } else {
                    if ($codigo === '') {
                        $codigo = Cliente::proximoCodigo();
                    }
                    Cliente::create([
                        'codigo'    => $codigo,
                        'nombre'    => $nombre,
                        'telefono'  => $telefono,
                        'direccion' => $direccion,
                        'notas'     => $notas,
                    ]);
                    $creados++;
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error procesando el archivo: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'creados'      => $creados,
            'actualizados' => $actualizados,
            'omitidos'     => $omitidos,
            'errores'      => $errores,
        ]);
    }
}
