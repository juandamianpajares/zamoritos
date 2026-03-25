<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Importa proveedores desde CSV, con deduplicación por RUT (compatible SICFE).
 *
 * Columnas (separador ; o ,):
 *   rut ; nombre ; telefono ; email ; direccion ; contacto ; notas ; activo
 *
 * Reglas:
 *  - rut y nombre son obligatorios
 *  - Si el RUT ya existe → actualiza datos de contacto (idempotente)
 *  - Si el RUT está vacío → crea siempre (sin deduplicar)
 *  - activo (0/1 o true/false) — en creación default true; en actualización solo se toca si la columna está presente
 */
class ImportarProveedoresController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate(['archivo' => 'required|file|mimes:csv,txt|max:2048']);

        $path   = $request->file('archivo')->getRealPath();
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return response()->json(['error' => 'No se pudo leer el archivo.'], 422);
        }

        // Detectar separador
        $primeraLinea = fgets($handle);
        rewind($handle);
        $sep = str_contains($primeraLinea, ';') ? ';' : ',';

        $cabecera = fgetcsv($handle, 0, $sep);
        if (!$cabecera) {
            fclose($handle);
            return response()->json(['error' => 'Archivo vacío o sin cabecera.'], 422);
        }
        $cabecera = array_map(fn($c) => mb_strtolower(trim($c)), $cabecera);

        $faltantes = array_diff(['rut', 'nombre'], $cabecera);
        if ($faltantes) {
            fclose($handle);
            return response()->json(['error' => 'Faltan columnas: ' . implode(', ', $faltantes)], 422);
        }

        $creados      = 0;
        $actualizados = 0;
        $omitidos     = 0;
        $errores      = [];
        $fila         = 1;

        while (($row = fgetcsv($handle, 0, $sep)) !== false) {
            $fila++;
            if (count(array_filter($row, fn($v) => trim($v) !== '')) === 0) continue;
            if (count($row) < count($cabecera)) {
                $row = array_pad($row, count($cabecera), '');
            }
            $data = array_combine($cabecera, array_map('trim', $row));

            $rut    = $data['rut']    ?? '';
            $nombre = $data['nombre'] ?? '';

            if (!$nombre) {
                $errores[] = ['fila' => $fila, 'error' => 'Nombre vacío'];
                continue;
            }

            // Campos de contacto opcionales
            $contacto = [
                'nombre'    => $nombre,
                'telefono'  => ($data['telefono']  ?? '') ?: null,
                'email'     => ($data['email']     ?? '') ?: null,
                'direccion' => ($data['direccion'] ?? '') ?: null,
                'contacto'  => ($data['contacto']  ?? '') ?: null,
                'notas'     => ($data['notas']     ?? '') ?: null,
            ];

            // Columna activo opcional: 1/true/si → true; 0/false/no → false
            $activoRaw = trim($data['activo'] ?? '');
            $tieneActivo = array_key_exists('activo', $data) && $activoRaw !== '';
            if ($tieneActivo) {
                $contacto['activo'] = !in_array(strtolower($activoRaw), ['0', 'false', 'no', 'inactivo']);
            }

            try {
                if ($rut) {
                    $existing = Proveedor::where('rut', $rut)->first();
                    if ($existing) {
                        // Actualiza solo campos no vacíos para no pisar datos existentes
                        $update = array_filter($contacto, fn($v) => $v !== null);
                        // activo siempre se aplica si vino en el CSV (puede ser false)
                        if ($tieneActivo) $update['activo'] = $contacto['activo'];
                        $existing->update($update);
                        $actualizados++;
                    } else {
                        Proveedor::create(array_merge(['rut' => $rut, 'activo' => true], $contacto));
                        $creados++;
                    }
                } else {
                    // Sin RUT: crear siempre
                    Proveedor::create(array_merge(['activo' => true], $contacto));
                    $creados++;
                }
            } catch (\Throwable $e) {
                $errores[] = ['fila' => $fila, 'error' => $e->getMessage()];
            }
        }

        fclose($handle);

        return response()->json([
            'creados'      => $creados,
            'actualizados' => $actualizados,
            'omitidos'     => $omitidos,
            'errores'      => $errores,
            'total_filas'  => $fila - 1,
        ]);
    }
}
