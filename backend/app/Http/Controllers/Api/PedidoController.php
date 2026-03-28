<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DetallePedido;
use App\Models\Pedido;
use App\Models\Producto;
use App\Services\WhatsappService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PedidoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Pedido::with('cliente', 'detalles.producto')
            ->orderByDesc('fecha')
            ->orderByDesc('id');

        if ($request->filled('estado') && $request->estado !== 'todos') {
            $q->where('estado', $request->estado);
        }

        if ($request->filled('cliente_id')) {
            $q->where('cliente_id', $request->cliente_id);
        }

        if ($request->filled('buscar')) {
            $b = '%' . $request->buscar . '%';
            $q->whereHas('cliente', fn($qr) =>
                $qr->where('nombre', 'like', $b)
                   ->orWhere('telefono', 'like', $b)
            );
        }

        $pedidos = $q->get()->map(fn($p) => $this->formatear($p));

        return response()->json($pedidos);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cliente_id'  => 'required|exists:clientes,id',
            'fecha'       => 'required|date',
            'costo_envio' => 'nullable|numeric|min:0',
            'medio_pago'  => 'nullable|string|max:50',
            'notas'       => 'nullable|string|max:1000',
            'detalles'    => 'required|array|min:1',
            'detalles.*.producto_id'    => 'nullable|exists:productos,id',
            'detalles.*.nombre_producto'=> 'required|string|max:200',
            'detalles.*.cantidad'       => 'required|numeric|min:0.001',
            'detalles.*.precio_unitario'=> 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $pedido = Pedido::create([
                'numero'      => Pedido::proximoNumero(),
                'cliente_id'  => $data['cliente_id'],
                'fecha'       => $data['fecha'],
                'estado'      => 'pendiente',
                'costo_envio' => $data['costo_envio'] ?? 0,
                'medio_pago'  => $data['medio_pago'] ?? null,
                'notas'       => $data['notas'] ?? null,
            ]);

            foreach ($data['detalles'] as $d) {
                $subtotal = round($d['cantidad'] * $d['precio_unitario'], 2);
                DetallePedido::create([
                    'pedido_id'      => $pedido->id,
                    'producto_id'    => $d['producto_id'] ?? null,
                    'nombre_producto'=> $d['nombre_producto'],
                    'cantidad'       => $d['cantidad'],
                    'precio_unitario'=> $d['precio_unitario'],
                    'subtotal'       => $subtotal,
                ]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }

        return response()->json($this->formatear($pedido->load('cliente', 'detalles.producto')), 201);
    }

    public function show(Pedido $pedido): JsonResponse
    {
        return response()->json($this->formatear($pedido->load('cliente', 'detalles.producto')));
    }

    public function cambiarEstado(Request $request, Pedido $pedido): JsonResponse
    {
        $data = $request->validate([
            'estado'           => 'required|in:pendiente,confirmado,enviado,entregado,cancelado',
            'enviar_whatsapp'  => 'nullable|boolean',
        ]);

        $pedido->update(['estado' => $data['estado']]);
        $pedido->load('cliente', 'detalles.producto');

        $pedidoArr    = $this->formatear($pedido);
        $enviarWa     = $data['enviar_whatsapp'] ?? true;
        $waEnviado    = null;

        if ($enviarWa) {
            $whatsapp  = app(WhatsappService::class);
            $waEnviado = $whatsapp->notificarCambioEstado($pedidoArr, $data['estado']);

            $pedido->update([
                'whatsapp_enviado'    => $waEnviado,
                'whatsapp_enviado_at' => $waEnviado ? now() : null,
            ]);
        }

        return response()->json(array_merge($pedidoArr, [
            'whatsapp_enviado'    => $pedido->whatsapp_enviado,
            'whatsapp_enviado_at' => $pedido->whatsapp_enviado_at,
        ]));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function formatear(Pedido $p): array
    {
        $subtotal = $p->detalles->sum('subtotal');
        return [
            'id'          => $p->id,
            'venta_id'    => $p->venta_id,
            'numero'      => $p->numero,
            'fecha'       => $p->fecha?->toDateString(),
            'estado'      => $p->estado,
            'costo_envio' => $p->costo_envio,
            'medio_pago'  => $p->medio_pago,
            'notas'               => $p->notas,
            'whatsapp_enviado'    => $p->whatsapp_enviado,
            'whatsapp_enviado_at' => $p->whatsapp_enviado_at,
            'subtotal'            => round($subtotal, 2),
            'total'               => round($subtotal + $p->costo_envio, 2),
            'cliente'     => [
                'id'        => $p->cliente?->id,
                'codigo'    => $p->cliente?->codigo,
                'nombre'    => $p->cliente?->nombre,
                'telefono'  => $p->cliente?->telefono,
                'direccion' => $p->cliente?->direccion,
            ],
            'detalles'    => $p->detalles->map(fn($d) => [
                'id'              => $d->id,
                'producto_id'     => $d->producto_id,
                'nombre_producto' => $d->nombre_producto,
                'cantidad'        => $d->cantidad,
                'precio_unitario' => $d->precio_unitario,
                'subtotal'        => $d->subtotal,
            ]),
        ];
    }
}
