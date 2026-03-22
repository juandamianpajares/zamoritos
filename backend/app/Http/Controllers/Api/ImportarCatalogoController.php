<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportarCatalogoController extends Controller
{
    /**
     * Importa productos desde un CSV (separador punto y coma).
     *
     * Columnas esperadas (cabecera obligatoria en fila 1):
     *   codigo_barras ; nombre ; marca ; categoria ; peso ; unidad_medida ;
     *   precio_compra ; precio_venta ; fraccionable ; en_promo ; precio_promo
     *
     * Reglas:
     *  - fraccionable / en_promo: 1 = sí, 0 o vacío = no
     *  - precio_compra / precio_promo: entero, puede quedar vacío
     *  - Si codigo_barras existe → actualiza; si no → crea
     *  - categoria: busca por nombre exacto (case insensitive); si no existe → null
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate(['archivo' => 'required|file|mimes:csv,txt|max:5120']);

        $path    = $request->file('archivo')->getRealPath();
        $handle  = fopen($path, 'r');

        if ($handle === false) {
            return response()->json(['error' => 'No se pudo leer el archivo.'], 422);
        }

        // Detectar separador (punto y coma o coma)
        $primeraLinea = fgets($handle);
        rewind($handle);
        $sep = str_contains($primeraLinea, ';') ? ';' : ',';

        // Leer cabecera
        $cabecera = fgetcsv($handle, 0, $sep);
        if (!$cabecera) {
            fclose($handle);
            return response()->json(['error' => 'Archivo vacío o sin cabecera.'], 422);
        }
        $cabecera = array_map(fn($c) => mb_strtolower(trim($c)), $cabecera);

        // Campos requeridos
        $requeridos = ['nombre', 'precio_venta', 'unidad_medida'];
        $faltantes  = array_diff($requeridos, $cabecera);
        if ($faltantes) {
            fclose($handle);
            return response()->json([
                'error' => 'Faltan columnas requeridas: ' . implode(', ', $faltantes),
            ], 422);
        }

        // Cache de categorías para no hacer una query por fila
        $catCache = Categoria::all()->keyBy(fn($c) => mb_strtolower($c->nombre));

        $fila       = 1; // ya leímos la cabecera
        $creados    = 0;
        $actualizados = 0;
        $errores    = [];

        while (($row = fgetcsv($handle, 0, $sep)) !== false) {
            $fila++;

            // Saltear filas completamente vacías
            if (count(array_filter($row, fn($v) => trim($v) !== '')) === 0) continue;

            // Combinar cabecera + fila
            if (count($row) < count($cabecera)) {
                $row = array_pad($row, count($cabecera), '');
            }
            $data = array_combine($cabecera, array_map('trim', $row));

            // Validaciones básicas
            if (empty($data['nombre'])) {
                $errores[] = ['fila' => $fila, 'error' => 'Nombre vacío'];
                continue;
            }
            $pv = (int) str_replace(['.', ','], '', $data['precio_venta'] ?? '');
            if ($pv <= 0) {
                $errores[] = ['fila' => $fila, 'error' => "precio_venta inválido: '{$data['precio_venta']}'"];
                continue;
            }

            // Categoría
            $catNombre = mb_strtolower($data['categoria'] ?? '');
            $categoriaId = $catNombre && isset($catCache[$catNombre])
                ? $catCache[$catNombre]->id
                : null;

            // Normalizar boolean
            $fraccionable = in_array(trim($data['fraccionable'] ?? ''), ['1', 'si', 'sí', 'true', 'yes']);
            $enPromo      = in_array(trim($data['en_promo']     ?? ''), ['1', 'si', 'sí', 'true', 'yes']);

            $pc      = isset($data['precio_compra']) && $data['precio_compra'] !== ''
                       ? (int) str_replace(['.', ','], '', $data['precio_compra'])
                       : null;
            $ppromo  = $enPromo && isset($data['precio_promo']) && $data['precio_promo'] !== ''
                       ? (int) str_replace(['.', ','], '', $data['precio_promo'])
                       : null;
            $peso    = isset($data['peso']) && $data['peso'] !== '' ? (float) str_replace(',', '.', $data['peso']) : null;

            $attrs = [
                'nombre'        => $data['nombre'],
                'marca'         => $data['marca'] ?? null ?: null,
                'categoria_id'  => $categoriaId,
                'peso'          => $peso,
                'unidad_medida' => $data['unidad_medida'] ?: 'unidad',
                'precio_venta'  => $pv,
                'precio_compra' => $pc,
                'fraccionable'  => $fraccionable,
                'en_promo'      => $enPromo,
                'precio_promo'  => $ppromo,
                'activo'        => true,
            ];

            $codigo = ($data['codigo_barras'] ?? '') ?: null;

            try {
                if ($codigo) {
                    $existia = Producto::where('codigo_barras', $codigo)->exists();
                    Producto::updateOrCreate(['codigo_barras' => $codigo], $attrs);
                    $existia ? $actualizados++ : $creados++;
                } else {
                    // Sin código: crear siempre (no se puede deduplicar)
                    Producto::create($attrs);
                    $creados++;
                }
            } catch (\Throwable $e) {
                $errores[] = ['fila' => $fila, 'error' => $e->getMessage()];
            }
        }

        fclose($handle);

        return response()->json([
            'creados'     => $creados,
            'actualizados'=> $actualizados,
            'errores'     => $errores,
            'total_filas' => $fila - 1,
        ]);
    }

    /**
     * Importa desde URL pública de Google Sheets (CSV export).
     * El frontend envía la URL del sheet; este endpoint la descarga y parsea.
     *
     * Para obtener la URL desde Google Sheets:
     *   Archivo → Compartir → Publicar en la web → CSV → Copiar enlace
     */
    public function fromSheets(Request $request): JsonResponse
    {
        $request->validate(['url' => 'required|url']);

        // Convertir URL de edición a URL de exportación CSV si es necesario
        $url = $request->url;
        // Formato: https://docs.google.com/spreadsheets/d/{id}/edit → /export?format=csv
        if (preg_match('#/spreadsheets/d/([^/]+)#', $url, $m)) {
            $sheetId = $m[1];
            // Extraer gid si existe
            $gid = '';
            if (preg_match('/[#&?]gid=(\d+)/', $url, $g)) {
                $gid = '&gid=' . $g[1];
            }
            $url = "https://docs.google.com/spreadsheets/d/{$sheetId}/export?format=csv{$gid}";
        }

        $csvContent = @file_get_contents($url);
        if ($csvContent === false) {
            return response()->json(['error' => 'No se pudo descargar el archivo. Verificá que el sheet sea público.'], 422);
        }

        // Guardar en archivo temporal y reutilizar la lógica de store()
        $tmpPath = tempnam(sys_get_temp_dir(), 'sheets_');
        file_put_contents($tmpPath, $csvContent);

        $tmpFile = new \Illuminate\Http\UploadedFile($tmpPath, 'sheets.csv', 'text/csv', null, true);
        $request->files->set('archivo', $tmpFile);

        return $this->store($request);
    }
}
