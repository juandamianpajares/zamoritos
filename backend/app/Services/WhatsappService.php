<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsappService
{
    private string $apiUrl;
    private string $apiKey;
    private string $instance;
    private string $countryCode;
    private bool $enabled;

    public function __construct()
    {
        $this->apiUrl     = rtrim(config('services.whatsapp.api_url', ''), '/');
        $this->apiKey     = config('services.whatsapp.api_key', '');
        $this->instance   = config('services.whatsapp.instance', 'zamoritos');
        $this->countryCode = config('services.whatsapp.country_code', '598');
        $this->enabled    = (bool) config('services.whatsapp.enabled', false);
    }

    /** Normaliza un teléfono al formato internacional sin '+' */
    public function normalizarTelefono(string $telefono): string
    {
        // Eliminar todo lo que no sea dígito
        $digits = preg_replace('/\D/', '', $telefono);

        // Si ya empieza con el código de país, devolver tal cual
        if (str_starts_with($digits, $this->countryCode)) {
            return $digits;
        }

        // Agregar código de país
        return $this->countryCode . $digits;
    }

    /** Verifica si el servicio está habilitado y tiene config */
    public function estaHabilitado(): bool
    {
        return $this->enabled && !empty($this->apiUrl) && !empty($this->apiKey);
    }

    /** Estado de la conexión de la instancia */
    public function estado(): array
    {
        if (!$this->estaHabilitado()) {
            return ['status' => 'disabled', 'mensaje' => 'WhatsApp no está habilitado'];
        }

        try {
            $res = Http::withHeaders($this->headers())
                ->timeout(8)
                ->get("{$this->apiUrl}/instance/connectionState/{$this->instance}");

            if ($res->successful()) {
                return $res->json() ?? ['status' => 'unknown'];
            }

            return ['status' => 'error', 'mensaje' => 'No se pudo obtener estado'];
        } catch (\Throwable $e) {
            Log::warning('WhatsApp estado error: ' . $e->getMessage());
            return ['status' => 'error', 'mensaje' => $e->getMessage()];
        }
    }

    /** Obtiene o crea la instancia y devuelve el QR */
    public function obtenerQr(): array
    {
        if (!$this->estaHabilitado()) {
            return ['error' => 'WhatsApp no está habilitado'];
        }

        try {
            // Intentar conectar instancia existente o crearla
            $estado = $this->estado();
            $stateVal = $estado['instance']['state'] ?? $estado['state'] ?? 'unknown';

            if ($stateVal !== 'open') {
                // Intentar crear instancia (si ya existe, devolverá el QR igual)
                $this->crearInstancia();
            }

            $res = Http::withHeaders($this->headers())
                ->timeout(10)
                ->get("{$this->apiUrl}/instance/connect/{$this->instance}");

            if ($res->successful()) {
                return $res->json() ?? [];
            }

            return ['error' => 'No se pudo obtener QR'];
        } catch (\Throwable $e) {
            Log::warning('WhatsApp QR error: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /** Crea la instancia en Evolution API si no existe */
    public function crearInstancia(): bool
    {
        try {
            $res = Http::withHeaders($this->headers())
                ->timeout(10)
                ->post("{$this->apiUrl}/instance/create", [
                    'instanceName' => $this->instance,
                    'qrcode'       => true,
                    'integration'  => 'WHATSAPP-BAILEYS',
                ]);

            return $res->successful();
        } catch (\Throwable $e) {
            Log::warning('WhatsApp crear instancia error: ' . $e->getMessage());
            return false;
        }
    }

    /** Envía un mensaje de texto a un número */
    public function enviarMensaje(string $telefono, string $mensaje): bool
    {
        if (!$this->estaHabilitado()) {
            Log::info("WhatsApp deshabilitado, mensaje no enviado a {$telefono}");
            return false;
        }

        $numero = $this->normalizarTelefono($telefono);

        try {
            $res = Http::withHeaders($this->headers())
                ->timeout(15)
                ->post("{$this->apiUrl}/message/sendText/{$this->instance}", [
                    'number' => $numero,
                    'text'   => $mensaje,
                ]);

            if ($res->successful()) {
                Log::info("WhatsApp enviado a {$numero}");
                return true;
            }

            Log::warning("WhatsApp fallo al enviar a {$numero}: " . $res->body());
            return false;
        } catch (\Throwable $e) {
            Log::warning("WhatsApp excepción al enviar a {$numero}: " . $e->getMessage());
            return false;
        }
    }

    /** Genera el mensaje de notificación según el estado del pedido */
    public function mensajeCambioEstado(array $pedido, string $nuevoEstado): string
    {
        $tienda  = config('services.whatsapp.tienda_nombre', 'Zamoritos');
        $numero  = $pedido['numero'];
        $cliente = $pedido['cliente']['nombre'] ?? 'Cliente';
        $total   = number_format($pedido['total'] ?? 0, 2, ',', '.');

        $lineas  = array_map(
            fn($d) => "  • {$d['nombre_producto']} x{$d['cantidad']}",
            $pedido['detalles'] ?? []
        );
        $detalleStr = implode("\n", $lineas);

        $emojis = [
            'pendiente'  => '🕐',
            'confirmado' => '✅',
            'enviado'    => '🚚',
            'entregado'  => '🎉',
            'cancelado'  => '❌',
        ];
        $emoji = $emojis[$nuevoEstado] ?? '📦';

        $estados = [
            'pendiente'  => 'está pendiente de confirmación',
            'confirmado' => 'fue *confirmado* y está siendo preparado',
            'enviado'    => 'está *en camino* hacia vos',
            'entregado'  => 'fue *entregado* exitosamente',
            'cancelado'  => 'fue *cancelado*',
        ];
        $descripcion = $estados[$nuevoEstado] ?? "cambió a {$nuevoEstado}";

        $msg = "{$emoji} *{$tienda}* — Pedido #{$numero}\n\n";
        $msg .= "Hola {$cliente}, tu pedido {$descripcion}.\n";

        if (!empty($detalleStr)) {
            $msg .= "\n*Productos:*\n{$detalleStr}\n";
        }

        $msg .= "\n*Total: \${$total}*";

        if ($nuevoEstado === 'enviado' && !empty($pedido['cliente']['direccion'])) {
            $msg .= "\n📍 Dirección: {$pedido['cliente']['direccion']}";
        }

        if ($nuevoEstado === 'entregado') {
            $msg .= "\n\n¡Gracias por elegirnos! 🐾";
        }

        return $msg;
    }

    /** Notifica al cliente el cambio de estado del pedido. Devuelve true si se envió. */
    public function notificarCambioEstado(array $pedido, string $nuevoEstado): bool
    {
        $telefono = $pedido['cliente']['telefono'] ?? null;

        if (empty($telefono)) {
            Log::info("WhatsApp: pedido {$pedido['numero']} sin teléfono, notificación omitida");
            return false;
        }

        $mensaje = $this->mensajeCambioEstado($pedido, $nuevoEstado);
        return $this->enviarMensaje($telefono, $mensaje);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function headers(): array
    {
        return [
            'apikey'       => $this->apiKey,
            'Content-Type' => 'application/json',
        ];
    }
}
