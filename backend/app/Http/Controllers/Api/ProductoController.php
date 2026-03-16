<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MovimientoStock;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Producto::with(['categoria', 'promoProducto'])->where('activo', true);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombre', 'like', "%$s%")
                  ->orWhere('codigo_barras', 'like', "%$s%")
                  ->orWhere('marca', 'like', "%$s%");
                if (is_numeric($s)) {
                    $q->orWhere('precio_venta', $s)
                      ->orWhere('precio_compra', $s);
                }
            });
        }

        if ($request->filled('categoria_id')) {
            $query->where('categoria_id', $request->categoria_id);
        }

        if ($request->boolean('stock_bajo')) {
            $query->whereColumn('stock', '<=', DB::raw('COALESCE(stock_minimo, 5)'));
        }

        if ($request->boolean('en_promo')) {
            $query->where('en_promo', true);
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function show(Producto $producto): JsonResponse
    {
        return response()->json($producto->load(['categoria', 'promoProducto']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'            => 'required|string',
            'codigo_barras'     => 'nullable|string|unique:productos,codigo_barras',
            'marca'             => 'nullable|string',
            'categoria_id'      => 'nullable|exists:categorias,id',
            'peso'              => 'nullable|numeric|min:0',
            'unidad_medida'     => 'required|string',
            'precio_venta'      => 'required|integer|min:0',
            'precio_compra'     => 'nullable|integer|min:0',
            'stock'             => 'nullable|numeric|min:0',
            'fraccionable'      => 'nullable|boolean',
            'en_promo'          => 'nullable|boolean',
            'precio_promo'      => 'nullable|integer|min:0',
            'promo_producto_id' => 'nullable|exists:productos,id',
            'foto_url'          => 'nullable|string|max:500',
        ]);

        return response()->json(Producto::create($data), 201);
    }

    public function update(Request $request, Producto $producto): JsonResponse
    {
        $data = $request->validate([
            'nombre'            => 'required|string',
            'codigo_barras'     => 'nullable|string|unique:productos,codigo_barras,' . $producto->id,
            'marca'             => 'nullable|string',
            'categoria_id'      => 'nullable|exists:categorias,id',
            'peso'              => 'nullable|numeric|min:0',
            'unidad_medida'     => 'required|string',
            'precio_venta'      => 'required|integer|min:0',
            'fraccionable'      => 'nullable|boolean',
            'en_promo'          => 'nullable|boolean',
            'precio_promo'      => 'nullable|integer|min:0',
            'promo_producto_id' => 'nullable|exists:productos,id',
            'foto_url'          => 'nullable|string|max:500',
        ]);

        $producto->update($data);
        return response()->json($producto->load(['categoria', 'promoProducto']));
    }

    public function destroy(Producto $producto): JsonResponse
    {
        $producto->update(['activo' => false]);
        return response()->json(null, 204);
    }

    public function toggleNotificacion(Producto $producto): JsonResponse
    {
        $producto->update(['notificar_stock_bajo' => !$producto->notificar_stock_bajo]);
        return response()->json($producto);
    }

    public function uploadFoto(Request $request, Producto $producto): JsonResponse
    {
        $request->validate(['foto' => 'required|image|max:4096']);

        if ($producto->foto) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($producto->foto);
        }

        $path = $request->file('foto')->store('productos', 'public');
        $producto->update(['foto' => $path]);

        return response()->json($producto->fresh(['categoria', 'promoProducto']));
    }

    /**
     * Fracciona una bolsa/unidad grande en unidades menores.
     */
    public function fraccionar(Request $request, Producto $producto): JsonResponse
    {
        $data = $request->validate([
            'cantidad_bolsas'    => 'required|numeric|min:0.001',
            'precio_fraccionado' => 'required|integer|min:0',
        ]);

        if ($producto->stock < $data['cantidad_bolsas']) {
            throw ValidationException::withMessages([
                'cantidad_bolsas' => "Stock insuficiente. Disponible: {$producto->stock} {$producto->unidad_medida}.",
            ]);
        }

        $pesoKg       = $producto->peso ?? 1;
        $unidadesAlta = round($data['cantidad_bolsas'] * $pesoKg, 3);
        $codigoFrac   = rtrim($producto->codigo_barras, '*') . '-F';

        return DB::transaction(function () use ($producto, $data, $codigoFrac, $unidadesAlta) {
            $fraccionado = Producto::firstOrCreate(
                ['codigo_barras' => $codigoFrac],
                [
                    'nombre'         => $producto->nombre . ' [Fraccionado]',
                    'marca'          => $producto->marca,
                    'categoria_id'   => $producto->categoria_id,
                    'peso'           => 1,
                    'unidad_medida'  => 'kg',
                    'precio_venta'   => $data['precio_fraccionado'],
                    'stock'          => 0,
                    'activo'         => true,
                    'fraccionado_de' => $producto->id,
                ]
            );

            $fraccionado->update([
                'precio_venta'   => $data['precio_fraccionado'],
                'fraccionado_de' => $producto->id,
            ]);

            $producto->decrement('stock', $data['cantidad_bolsas']);
            MovimientoStock::create([
                'producto_id' => $producto->id,
                'tipo'        => 'ajuste',
                'cantidad'    => -$data['cantidad_bolsas'],
                'referencia'  => 'fraccionado → ' . $codigoFrac,
                'observacion' => "Se fraccionaron {$data['cantidad_bolsas']} bolsa(s) → {$unidadesAlta} kg",
            ]);

            $fraccionado->increment('stock', $unidadesAlta);
            MovimientoStock::create([
                'producto_id' => $fraccionado->id,
                'tipo'        => 'ingreso',
                'cantidad'    => $unidadesAlta,
                'referencia'  => 'fraccionado de ' . $producto->codigo_barras,
                'observacion' => "Fraccionado desde {$producto->nombre}",
            ]);

            return response()->json([
                'original'           => $producto->fresh('categoria'),
                'fraccionado'        => $fraccionado->fresh('categoria'),
                'unidades_generadas' => $unidadesAlta,
                'codigo_fraccionado' => $codigoFrac,
            ]);
        });
    }
}
