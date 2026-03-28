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
     *   precio_venta ; fraccionable ; modo_fraccion ; destacado
     *
     * Reglas:
     *  - fraccionable / destacado: 1 = sí, 0 o vacío = no
     *  - precio_venta: entero obligatorio
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
        $requeridos = ['nombre', 'precio_venta'];
        $faltantes  = array_diff($requeridos, $cabecera);
        if ($faltantes) {
            fclose($handle);
            return response()->json([
                'error' => 'Faltan columnas requeridas: ' . implode(', ', $faltantes),
            ], 422);
        }

        // Cache de categorías para no hacer una query por fila
        $catCache = Categoria::all()->keyBy(fn($c) => mb_strtolower(trim($c->nombre)));

        $fila       = 1; // ya leímos la cabecera
        $creados    = 0;
        $actualizados = 0;
        $errores    = [];
        $catNoEncontradas = [];

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
            $pv = (int) round(self::normalizeDecimal($data['precio_venta'] ?? ''));
            if ($pv <= 0) {
                $errores[] = ['fila' => $fila, 'error' => "precio_venta inválido: '{$data['precio_venta']}'"];
                continue;
            }
            $pcRaw = trim($data['precio_compra'] ?? '');
            $pc    = $pcRaw !== '' ? (int) round(self::normalizeDecimal($pcRaw)) : null;

            // Categoría
            $catNombre = mb_strtolower(trim($data['categoria'] ?? ''));
            $categoriaId = null;
            if ($catNombre) {
                if (isset($catCache[$catNombre])) {
                    $categoriaId = $catCache[$catNombre]->id;
                } else {
                    $catNoEncontradas[$catNombre] = true;
                }
            }

            // Normalizar boolean
            $fraccionable = in_array(trim($data['fraccionable'] ?? ''), ['1', 'si', 'sí', 'true', 'yes']);
            $destacado    = in_array(trim($data['destacado']    ?? ''), ['1', 'si', 'sí', 'true', 'yes']);
            $peso         = isset($data['peso']) && $data['peso'] !== '' ? self::normalizeDecimal($data['peso']) : null;
            $modoFracRaw  = strtolower(trim($data['modo_fraccion'] ?? ''));
            $modoFraccion = in_array($modoFracRaw, ['unidad', 'u']) ? 'unidad' : 'kg';

            // en_promo: 0=sin promo | 1=COMBO | 2=OFERTA | 3=REGALO
            $enPromoRaw = trim($data['en_promo'] ?? '');
            $enPromo    = in_array($enPromoRaw, ['1', '2', '3']) ? (int) $enPromoRaw : 0;

            $precioPromoRaw = trim($data['precio_promo'] ?? '');
            $precioPromo    = ($precioPromoRaw !== '' && $precioPromoRaw !== '0')
                ? (int) round(self::normalizeDecimal($precioPromoRaw))
                : null;

            $attrs = [
                'nombre'        => $data['nombre'],
                'marca'         => $data['marca'] ?? null ?: null,
                'categoria_id'  => $categoriaId,
                'peso'          => $peso,
                'unidad_medida' => $data['unidad_medida'] ?: 'unidad',
                'precio_venta'  => $pv,
                'fraccionable'  => $fraccionable,
                'modo_fraccion' => $modoFraccion,
                'destacado'     => $destacado,
                'en_promo'      => $enPromo,
                'precio_promo'  => $precioPromo,
                'activo'        => true,
            ];
            if ($pc !== null) $attrs['precio_compra'] = $pc;

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
            'creados'              => $creados,
            'actualizados'         => $actualizados,
            'errores'              => $errores,
            'total_filas'          => $fila - 1,
            'categorias_no_encontradas' => array_keys($catNoEncontradas),
        ]);
    }

    /**
     * Importa desde URL pública de Google Sheets (CSV export).
     * El frontend envía la URL del sheet; este endpoint la descarga y parsea.
     *
     * Para obtener la URL desde Google Sheets:
     *   Archivo → Compartir → Publicar en la web → CSV → Copiar enlace
     */
    /**
     * Normaliza un string numérico aceptando tanto punto como coma como separador decimal.
     *
     *  "22.5"    → 22.5   "22,5"    → 22.5
     *  "1.200"   → 1200   "1,200"   → 1200  (miles con 3 dígitos → miles)
     *  "1200.00" → 1200   "1200,00" → 1200
     *  "1.234,56"→ 1234.56  "1,234.56" → 1234.56
     */
    private static function normalizeDecimal(string $v): float
    {
        $v = preg_replace('/[^\d.,\-]/', '', trim($v));
        if ($v === '' || $v === '-') return 0.0;

        $hasDot   = str_contains($v, '.');
        $hasComma = str_contains($v, ',');

        if ($hasDot && $hasComma) {
            // Formato mixto: el último separador es el decimal
            if (strrpos($v, ',') > strrpos($v, '.')) {
                // "1.234,56" → estilo europeo
                $v = str_replace('.', '', $v);
                $v = str_replace(',', '.', $v);
            } else {
                // "1,234.56" → estilo anglosajón
                $v = str_replace(',', '', $v);
            }
        } elseif ($hasComma) {
            $parts = explode(',', $v);
            // Si hay exactamente una coma y la parte después tiene 1-2 dígitos → decimal
            if (count($parts) === 2 && strlen($parts[1]) <= 2) {
                $v = str_replace(',', '.', $v);
            } else {
                $v = str_replace(',', '', $v); // separador de miles
            }
        } elseif ($hasDot) {
            $parts = explode('.', $v);
            // Si la última parte tiene exactamente 3 dígitos → separador de miles
            if (count($parts) > 1 && strlen(end($parts)) === 3) {
                $v = str_replace('.', '', $v);
            }
            // Si tiene 1-2 dígitos al final → decimal → dejar como está
        }

        return (float) $v;
    }

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
