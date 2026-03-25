<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use App\Services\ImagenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Importación masiva de imágenes.
 *
 * POST /api/imagenes/importar
 *   Body: multipart/form-data
 *   Campo: fotos[] → array de archivos imagen
 *
 * Lógica de matching (en orden):
 *   1. Nombre del archivo (sin extensión) = codigo_barras exacto
 *   2. Nombre del archivo (sin extensión) = slug del nombre del producto
 *   3. Nombre del archivo contiene el codigo_barras (ej: "lager_7730918030044.jpg")
 *
 * Devuelve:
 *   { procesados: N, errores: [...], resultados: [...] }
 */
class ImagenController extends Controller
{
    public function importar(Request $request, ImagenService $img): JsonResponse
    {
        $request->validate([
            'fotos'   => 'required|array|max:100',
            'fotos.*' => 'required|image|mimes:jpg,jpeg,png,webp,gif|max:8192',
        ]);

        // Cargar todos los productos activos una sola vez
        $productos = Producto::where('activo', true)
            ->select('id', 'nombre', 'codigo_barras', 'foto', 'thumb')
            ->get();

        // Índices para búsqueda rápida
        $porCodigo = $productos->keyBy('codigo_barras');
        $porSlug   = $productos->keyBy(fn($p) => $img->slug($p->nombre));

        $procesados = 0;
        $errores    = [];
        $resultados = [];

        foreach ($request->file('fotos') as $archivo) {
            $nombreArchivo = pathinfo($archivo->getClientOriginalName(), PATHINFO_FILENAME);

            // 1) Coincidencia exacta por código de barras
            $producto = $porCodigo->get($nombreArchivo);

            // 2) Coincidencia por slug del nombre
            if (!$producto) {
                $producto = $porSlug->get($img->slug($nombreArchivo));
            }

            // 3) El nombre del archivo contiene algún código de barras
            if (!$producto) {
                foreach ($porCodigo as $codigo => $p) {
                    if ($codigo && str_contains($nombreArchivo, (string) $codigo)) {
                        $producto = $p;
                        break;
                    }
                }
            }

            if (!$producto) {
                $errores[] = [
                    'archivo' => $archivo->getClientOriginalName(),
                    'error'   => 'No se encontró producto coincidente.',
                ];
                continue;
            }

            try {
                // Borrar fotos previas
                if ($producto->foto)  Storage::disk('public')->delete($producto->foto);
                if ($producto->thumb) Storage::disk('public')->delete($producto->thumb);

                $slug  = $img->slug($producto->codigo_barras ?? (string) $producto->id);
                $paths = $img->guardarProducto($archivo->getRealPath(), $slug);

                $producto->update(['foto' => $paths['foto'], 'thumb' => $paths['thumb']]);

                $procesados++;
                $resultados[] = [
                    'archivo'  => $archivo->getClientOriginalName(),
                    'producto' => $producto->nombre,
                    'foto'     => $paths['foto'],
                    'thumb'    => $paths['thumb'],
                ];
            } catch (\Throwable $e) {
                $errores[] = [
                    'archivo' => $archivo->getClientOriginalName(),
                    'error'   => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'procesados' => $procesados,
            'errores'    => $errores,
            'resultados' => $resultados,
        ]);
    }

    /**
     * Devuelve los requisitos de imagen para mostrar al usuario en el frontend.
     */
    public function requisitos(): JsonResponse
    {
        return response()->json(ImagenService::REQUISITOS);
    }
}
