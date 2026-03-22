<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Importa categorías desde CSV.
 *
 * Formato (separador ; — primera fila = cabecera):
 *   nombre ; parent
 *
 * Reglas:
 *   - parent vacío → categoría raíz
 *   - parent con valor → busca una categoría raíz con ese nombre (case insensitive)
 *     Si no existe la raíz, la crea también.
 *   - Usa firstOrCreate → nunca duplica si ya existe la combinación nombre+parent_id
 *
 * Ejemplo de CSV:
 *   nombre;parent
 *   ALIMENTOS;
 *   SNACK;
 *   PERRO;ALIMENTOS
 *   GATO;ALIMENTOS
 *   RAZA PEQUEÑA;PERRO
 *   ADULTO;GATO
 */
class ImportarCategoriasController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate(['archivo' => 'required|file|mimes:csv,txt|max:1024']);

        $path   = $request->file('archivo')->getRealPath();
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return response()->json(['error' => 'No se pudo leer el archivo.'], 422);
        }

        // Detectar separador
        $primera = fgets($handle);
        rewind($handle);
        $sep = str_contains($primera, ';') ? ';' : ',';

        // Leer cabecera
        $cab = fgetcsv($handle, 0, $sep);
        if (!$cab) {
            fclose($handle);
            return response()->json(['error' => 'Archivo vacío.'], 422);
        }
        $cab = array_map(fn($c) => mb_strtolower(trim($c)), $cab);

        if (!in_array('nombre', $cab)) {
            fclose($handle);
            return response()->json(['error' => 'Falta columna "nombre".'], 422);
        }

        // Cache de todas las categorías (se actualiza a medida que se crean)
        // Clave: "NOMBRE|||parent_id" para evitar colisiones entre niveles
        $cache = Categoria::all()->mapWithKeys(fn($c) => [
            mb_strtoupper(trim($c->nombre)) . '|||' . ($c->parent_id ?? '') => $c
        ])->toArray();

        $creadas   = 0;
        $existentes = 0;
        $errores   = [];
        $fila      = 1;

        while (($row = fgetcsv($handle, 0, $sep)) !== false) {
            $fila++;
            if (count(array_filter($row, fn($v) => trim($v) !== '')) === 0) continue;
            if (count($row) < count($cab)) {
                $row = array_pad($row, count($cab), '');
            }
            $data = array_combine($cab, array_map('trim', $row));

            $nombre = mb_strtoupper($data['nombre'] ?? '');
            if (!$nombre) {
                $errores[] = ['fila' => $fila, 'error' => 'Nombre vacío'];
                continue;
            }

            $parentNombre = mb_strtoupper($data['parent'] ?? '');
            $parentId     = null;

            if ($parentNombre) {
                // Buscar el parent en cache (primero sin parent propio, luego cualquier nivel)
                $parentKey = $parentNombre . '|||';
                if (!isset($cache[$parentKey])) {
                    // Buscar en cualquier nivel
                    $found = null;
                    foreach ($cache as $key => $cat) {
                        if (str_starts_with($key, $parentNombre . '|||')) {
                            $found = $cat;
                            break;
                        }
                    }
                    if (!$found) {
                        // Crear la categoría padre como raíz
                        $found = Categoria::firstOrCreate(
                            ['nombre' => $parentNombre, 'parent_id' => null]
                        );
                        $cache[$parentNombre . '|||'] = $found;
                        if ($found->wasRecentlyCreated) $creadas++;
                    }
                    $parentId = is_array($found) ? $found['id'] : $found->id;
                } else {
                    $parentId = is_array($cache[$parentKey])
                        ? $cache[$parentKey]['id']
                        : $cache[$parentKey]->id;
                }
            }

            $cacheKey = $nombre . '|||' . ($parentId ?? '');
            if (isset($cache[$cacheKey])) {
                $existentes++;
                continue;
            }

            try {
                $cat = Categoria::firstOrCreate(
                    ['nombre' => $nombre, 'parent_id' => $parentId]
                );
                $cache[$cacheKey] = $cat;
                if ($cat->wasRecentlyCreated) {
                    $creadas++;
                } else {
                    $existentes++;
                }
            } catch (\Throwable $e) {
                $errores[] = ['fila' => $fila, 'error' => $e->getMessage()];
            }
        }

        fclose($handle);

        return response()->json([
            'creadas'    => $creadas,
            'existentes' => $existentes,
            'errores'    => $errores,
        ]);
    }
}
