<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WhatsappService;
use Illuminate\Http\Request;

class WhatsappController extends Controller
{
    public function __construct(private WhatsappService $whatsapp) {}

    /** GET /api/whatsapp/status */
    public function status(): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'habilitado' => $this->whatsapp->estaHabilitado(),
            'estado'     => $this->whatsapp->estado(),
        ]);
    }

    /** GET /api/whatsapp/qr */
    public function qr(): \Illuminate\Http\JsonResponse
    {
        return response()->json($this->whatsapp->obtenerQr());
    }

    /** POST /api/whatsapp/conectar */
    public function conectar(): \Illuminate\Http\JsonResponse
    {
        $creado = $this->whatsapp->crearInstancia();
        $qr     = $this->whatsapp->obtenerQr();

        return response()->json([
            'instancia_creada' => $creado,
            'qr'               => $qr,
        ]);
    }

    /** POST /api/whatsapp/test — envía un mensaje de prueba */
    public function test(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'telefono' => 'required|string',
            'mensaje'  => 'nullable|string|max:500',
        ]);

        $tienda  = config('services.whatsapp.tienda_nombre', 'Zamoritos');
        $mensaje = $request->get('mensaje', "✅ Mensaje de prueba desde *{$tienda}*. WhatsApp funcionando correctamente.");

        $ok = $this->whatsapp->enviarMensaje($request->get('telefono'), $mensaje);

        return response()->json([
            'enviado' => $ok,
            'mensaje' => $ok ? 'Mensaje enviado' : 'No se pudo enviar el mensaje',
        ]);
    }
}
