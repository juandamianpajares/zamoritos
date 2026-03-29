'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api, type Cliente, type Pedido, type EstadoPedido, type DetallePedido } from '@/lib/api';

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' });

// ── Configuración de estados ──────────────────────────────────────────────────
const ESTADO_CFG: Record<EstadoPedido, { label: string; pill: string; dot: string; next?: EstadoPedido; nextLabel?: string }> = {
  pendiente:    { label: 'Pendiente',    pill: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-400',    next: 'preparando',   nextLabel: 'Preparar' },
  preparando:   { label: 'Preparando',  pill: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-400',   next: 'sin_facturar', nextLabel: 'Listo p/ entregar' },
  sin_facturar: { label: 'Sin facturar',pill: 'bg-yellow-100 text-yellow-700',  dot: 'bg-yellow-400',   next: 'enviado',      nextLabel: 'Marcar enviado' },
  confirmado:   { label: 'Confirmado',  pill: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-400',     next: 'enviado',      nextLabel: 'Marcar enviado' },
  enviado:      { label: 'Enviado',     pill: 'bg-violet-100 text-violet-700',  dot: 'bg-violet-400',   next: 'entregado',    nextLabel: 'Confirmar entrega' },
  entregado:    { label: 'Entregado',   pill: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500' },
  cancelado:    { label: 'Cancelado',   pill: 'bg-zinc-100 text-zinc-500',      dot: 'bg-zinc-300' },
};

// Estados que al cancelar requieren el diálogo de tipo de cancelación
const ESTADOS_CON_CANCELACION: EstadoPedido[] = ['preparando','sin_facturar','enviado'];

const MEDIOS = ['efectivo','tarjeta','transferencia','oca','master','anda','cabal','otro'];

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{children}</span>;
}

// ── Icono WhatsApp ────────────────────────────────────────────────────────────
function WaIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.057 23.5a.5.5 0 0 0 .613.613l5.701-1.465A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.653-.51-5.168-1.401l-.371-.219-3.853.99.999-3.773-.228-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  );
}

// ── Badge WhatsApp en lista ───────────────────────────────────────────────────
function WaBadge({ enviado }: { enviado?: boolean | null }) {
  if (enviado === true)  return <span title="WhatsApp enviado"    className="text-emerald-500 opacity-70"><WaIcon size={13} /></span>;
  if (enviado === false) return <span title="WhatsApp falló"      className="text-rose-400 opacity-70"><WaIcon size={13} /></span>;
  return null;
}

// ── Modal configurar WhatsApp (QR) ───────────────────────────────────────────
function ModalWhatsappSetup({ onClose }: { onClose: () => void }) {
  const [estado,   setEstado]   = useState<'idle'|'loading'|'conectado'|'error'>('idle');
  const [qrData,   setQrData]   = useState<string | null>(null);
  const [msg,      setMsg]      = useState('');
  const [testTel,  setTestTel]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [testOk,   setTestOk]   = useState<boolean | null>(null);

  const checkStatus = useCallback(async () => {
    setEstado('loading');
    try {
      const r = await api.get<{ habilitado: boolean; estado: any }>('/whatsapp/status');
      if (!r.habilitado) { setEstado('error'); setMsg('WhatsApp no habilitado en el servidor.'); return; }
      const state = r.estado?.instance?.state ?? r.estado?.state ?? 'unknown';
      if (state === 'open') { setEstado('conectado'); setMsg(''); }
      else { setEstado('idle'); setMsg(`Estado: ${state}`); }
    } catch { setEstado('error'); setMsg('No se pudo conectar con el servidor WhatsApp.'); }
  }, []);

  const conectar = async () => {
    setEstado('loading'); setQrData(null);
    try {
      const r = await api.post<any>('/whatsapp/conectar', {});
      const qr = r?.qr?.base64 ?? r?.qr?.qrcode ?? null;
      setQrData(qr);
      setEstado('idle');
      setMsg('Escaneá el QR con WhatsApp → Dispositivos vinculados → Vincular dispositivo');
    } catch { setEstado('error'); setMsg('Error al obtener QR.'); }
  };

  const sendTest = async () => {
    if (!testTel) return;
    setSending(true); setTestOk(null);
    try {
      const r = await api.post<{ enviado: boolean }>('/whatsapp/test', { telefono: testTel });
      setTestOk(r.enviado);
    } catch { setTestOk(false); }
    setSending(false);
  };

  useEffect(() => { checkStatus(); }, [checkStatus]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500"><WaIcon size={18} /></span>
            <h3 className="font-bold text-zinc-900">Configurar WhatsApp</h3>
          </div>
          <button onClick={onClose} className="text-zinc-300 hover:text-zinc-500">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="15" y2="15"/><line x1="15" y1="1" x2="1" y2="15"/></svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Estado */}
          <div className="flex items-center gap-3">
            {estado === 'loading'   && <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />}
            {estado === 'conectado' && <span className="w-3 h-3 rounded-full bg-emerald-500" />}
            {estado === 'idle'      && <span className="w-3 h-3 rounded-full bg-zinc-300" />}
            {estado === 'error'     && <span className="w-3 h-3 rounded-full bg-rose-400" />}
            <span className="text-sm text-zinc-600">
              {estado === 'loading'   && 'Verificando…'}
              {estado === 'conectado' && 'Conectado y listo'}
              {estado === 'idle'      && (msg || 'Desconectado')}
              {estado === 'error'     && (msg || 'Error')}
            </span>
            <button onClick={checkStatus} className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 underline">Actualizar</button>
          </div>

          {/* QR */}
          {estado !== 'conectado' && (
            <div className="text-center space-y-3">
              {qrData ? (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">{msg}</p>
                  <img src={qrData.startsWith('data:') ? qrData : `data:image/png;base64,${qrData}`}
                    alt="QR WhatsApp" className="mx-auto w-56 h-56 object-contain border border-zinc-100 rounded-xl" />
                  <button onClick={checkStatus} className="mt-2 text-xs text-[var(--brand-purple)] hover:opacity-75 underline">
                    Ya escaneé el QR — verificar conexión
                  </button>
                </div>
              ) : (
                <button onClick={conectar} disabled={estado === 'loading'}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50">
                  {estado === 'loading' ? 'Cargando…' : 'Obtener QR para vincular'}
                </button>
              )}
            </div>
          )}

          {/* Test mensaje */}
          {estado === 'conectado' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-500">Enviar mensaje de prueba</p>
              <div className="flex gap-2">
                <input value={testTel} onChange={e => setTestTel(e.target.value)}
                  placeholder="Teléfono (ej: 099123456)"
                  className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                <button onClick={sendTest} disabled={!testTel || sending}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50">
                  {sending ? '…' : 'Enviar'}
                </button>
              </div>
              {testOk === true  && <p className="text-xs text-emerald-600">Mensaje enviado correctamente.</p>}
              {testOk === false && <p className="text-xs text-rose-500">No se pudo enviar. Verificá el número.</p>}
            </div>
          )}

          <p className="text-xs text-zinc-400 bg-zinc-50 rounded-xl px-3 py-2">
            Los clientes recibirán un mensaje automático cuando cambie el estado de su pedido. El teléfono del cliente debe estar cargado.
          </p>
        </div>

        <div className="px-5 py-4 border-t border-zinc-100">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal cancelación ─────────────────────────────────────────────────────────
type TipoCancelacion = 'anulacion' | 'devolucion' | 'cancelado_entrega';

function ModalCancelacion({ pedido, onClose, onConfirm }: {
  pedido: Pedido;
  onClose: () => void;
  onConfirm: (tipo: TipoCancelacion) => void;
}) {
  const [tipo, setTipo] = useState<TipoCancelacion | null>(null);

  const opciones: { value: TipoCancelacion; label: string; desc: string; color: string }[] = [
    { value: 'anulacion',        label: 'Anular pedido',           desc: 'Se revierte stock y se deja sin efecto', color: 'border-rose-300 bg-rose-50 text-rose-700' },
    { value: 'devolucion',       label: 'Devolución',              desc: 'El cliente devuelve la mercadería', color: 'border-amber-300 bg-amber-50 text-amber-700' },
    { value: 'cancelado_entrega',label: 'Canceló la entrega',      desc: `Genera saldo faltante "${fmt(pedido.total)}" — Pedido retirado por el cliente`, color: 'border-blue-300 bg-blue-50 text-blue-700' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900">¿Cómo proceder con {pedido.numero}?</h2>
          <p className="text-xs text-zinc-400 mt-1">El pedido estaba en estado <strong>{ESTADO_CFG[pedido.estado]?.label}</strong>.</p>
        </div>

        <div className="space-y-2">
          {opciones.map(op => (
            <button
              key={op.value}
              type="button"
              onClick={() => setTipo(op.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                tipo === op.value ? op.color + ' border-opacity-100' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <p className="text-sm font-semibold">{op.label}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{op.desc}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Volver</button>
          <button
            onClick={() => tipo && onConfirm(tipo)}
            disabled={!tipo}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-zinc-900 text-white disabled:opacity-40 hover:bg-zinc-800 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal detalle pedido ──────────────────────────────────────────────────────
function ModalDetalle({ pedido, onClose, onAvanzar }: {
  pedido: Pedido;
  onClose: () => void;
  onAvanzar: (id: number, e: EstadoPedido, tipoCancelacion?: TipoCancelacion) => void;
}) {
  const cfg = ESTADO_CFG[pedido.estado];
  const [sendingWa,    setSendingWa]    = useState(false);
  const [waOk,         setWaOk]         = useState<boolean | null>(null);
  const [cancelDialog, setCancelDialog] = useState(false);

  const enviarWaManual = async () => {
    setSendingWa(true); setWaOk(null);
    try {
      const r = await api.patch<Pedido>(`/pedidos/${pedido.id}/estado`, { estado: pedido.estado, enviar_whatsapp: true });
      setWaOk(r.whatsapp_enviado ?? false);
    } catch { setWaOk(false); }
    setSendingWa(false);
  };
  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h3 className="font-bold text-zinc-900">{pedido.numero}</h3>
            <p className="text-xs text-zinc-400">{fmtDate(pedido.fecha)}</p>
          </div>
          <Pill color={cfg.pill}>{cfg.label}</Pill>
          <button onClick={onClose} className="ml-3 text-zinc-300 hover:text-zinc-500">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="15" y2="15"/><line x1="15" y1="1" x2="1" y2="15"/></svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Cliente</p>
            <p className="text-sm font-semibold text-zinc-800">{pedido.cliente.nombre}</p>
            <p className="text-xs font-mono text-zinc-400">{pedido.cliente.codigo}</p>
            {pedido.cliente.telefono && <p className="text-sm text-zinc-500">{pedido.cliente.telefono}</p>}
            {pedido.cliente.direccion && <p className="text-sm text-zinc-500">{pedido.cliente.direccion}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Productos</p>
            <div className="space-y-1.5">
              {pedido.detalles.map((d, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-zinc-700">{d.cantidad}× {d.nombre_producto}</span>
                  <span className="tabular-nums font-medium text-zinc-800">{fmt(d.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-zinc-100 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Subtotal</span><span className="tabular-nums">{fmt(pedido.subtotal)}</span>
            </div>
            {pedido.costo_envio > 0 && (
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Envío</span><span className="tabular-nums">{fmt(pedido.costo_envio)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-zinc-900 pt-1 border-t border-zinc-100">
              <span>Total</span><span className="tabular-nums">{fmt(pedido.total)}</span>
            </div>
            {pedido.medio_pago && <p className="text-xs text-zinc-400 capitalize">Pago: {pedido.medio_pago}</p>}
          </div>
          {pedido.notas && (
            <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-800">
              <span className="font-medium">Nota: </span>{pedido.notas}
            </div>
          )}

          {/* WhatsApp status */}
          <div className="flex items-center gap-2 flex-wrap">
            {pedido.whatsapp_enviado === true && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                <WaIcon size={12} /> Notificado por WhatsApp
              </span>
            )}
            {pedido.whatsapp_enviado === false && (
              <span className="flex items-center gap-1.5 text-xs text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full">
                <WaIcon size={12} /> WhatsApp falló
              </span>
            )}
            {pedido.cliente.telefono && (
              <button onClick={enviarWaManual} disabled={sendingWa}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-600 disabled:opacity-50 ml-auto">
                <WaIcon size={12} />
                {sendingWa ? 'Enviando…' : 'Enviar WhatsApp ahora'}
              </button>
            )}
            {waOk === true  && <span className="text-xs text-emerald-600">✓ Enviado</span>}
            {waOk === false && <span className="text-xs text-rose-500">✗ Falló</span>}
          </div>
        </div>
        {cfg.next && (
          <div className="px-5 py-4 border-t border-zinc-100 flex gap-2">
            <button onClick={() => { onAvanzar(pedido.id, cfg.next!); onClose(); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[var(--brand-purple)] text-white hover:opacity-90">
              {cfg.nextLabel}
            </button>
            <button
              onClick={() => {
                if (ESTADOS_CON_CANCELACION.includes(pedido.estado)) {
                  setCancelDialog(true);
                } else {
                  onAvanzar(pedido.id, 'cancelado');
                  onClose();
                }
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200 text-zinc-500 hover:border-rose-200 hover:text-rose-600">
              Cancelar pedido
            </button>
          </div>
        )}
      </div>
    </div>
    {cancelDialog && (
      <ModalCancelacion
        pedido={pedido}
        onClose={() => setCancelDialog(false)}
        onConfirm={(tipo) => {
          onAvanzar(pedido.id, 'cancelado', tipo);
          setCancelDialog(false);
          onClose();
        }}
      />
    )}
    </>
  );
}

// ── Modal alta de pedido ──────────────────────────────────────────────────────
function ModalNuevoPedido({ onClose, onCreado, clientes, productos }: {
  onClose: () => void;
  onCreado: (p: Pedido) => void;
  clientes: Cliente[];
  productos: { id: number; nombre: string; precio_venta: number }[];
}) {
  const [clienteId, setClienteId]   = useState('');
  const [clienteBusq, setClienteBusq] = useState('');
  const [showClientes, setShowClientes] = useState(false);
  const [fecha, setFecha]           = useState(new Date().toISOString().slice(0, 10));
  const [medioP, setMedioP]         = useState('efectivo');
  const [envio, setEnvio]           = useState('');
  const [notas, setNotas]           = useState('');
  const [detalles, setDetalles]     = useState<DetallePedido[]>([
    { nombre_producto: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }
  ]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const clientesFiltrados = clientes.filter(c =>
    clienteBusq === '' ||
    c.nombre.toLowerCase().includes(clienteBusq.toLowerCase()) ||
    (c.telefono ?? '').includes(clienteBusq) ||
    c.codigo.toLowerCase().includes(clienteBusq.toLowerCase())
  );

  const clienteSel = clientes.find(c => c.id === Number(clienteId));

  const setDetalle = (i: number, field: keyof DetallePedido, val: string | number) => {
    setDetalles(prev => prev.map((d, idx) => {
      if (idx !== i) return d;
      const updated = { ...d, [field]: val };
      updated.subtotal = Math.round(Number(updated.cantidad) * Number(updated.precio_unitario) * 100) / 100;
      return updated;
    }));
  };

  const elegirProducto = (i: number, prod: { id: number; nombre: string; precio_venta: number }) => {
    setDetalles(prev => prev.map((d, idx) => {
      if (idx !== i) return d;
      const updated = {
        ...d,
        producto_id: prod.id,
        nombre_producto: prod.nombre,
        precio_unitario: prod.precio_venta,
        subtotal: Math.round(d.cantidad * prod.precio_venta * 100) / 100,
      };
      return updated;
    }));
  };

  const addLinea = () => setDetalles(prev => [...prev, { nombre_producto: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
  const removeLinea = (i: number) => setDetalles(prev => prev.filter((_, idx) => idx !== i));

  const subtotal = detalles.reduce((s, d) => s + d.subtotal, 0);
  const costoEnvio = parseFloat(envio) || 0;
  const total = subtotal + costoEnvio;

  const guardar = async () => {
    setError('');
    if (!clienteId) { setError('Seleccioná un cliente.'); return; }
    if (detalles.some(d => !d.nombre_producto)) { setError('Completá todos los productos.'); return; }
    setSaving(true);
    try {
      const pedido = await api.post<Pedido>('/pedidos', {
        cliente_id:  Number(clienteId),
        fecha,
        costo_envio: costoEnvio,
        medio_pago:  medioP,
        notas:       notas || null,
        detalles:    detalles.map(d => ({
          producto_id:     d.producto_id ?? null,
          nombre_producto: d.nombre_producto,
          cantidad:        Number(d.cantidad),
          precio_unitario: Number(d.precio_unitario),
        })),
      });
      onCreado(pedido);
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-purple)] bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <h3 className="font-bold text-zinc-900">Nuevo pedido</h3>
          <button onClick={onClose} className="text-zinc-300 hover:text-zinc-500">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="15" y2="15"/><line x1="15" y1="1" x2="1" y2="15"/></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Cliente *</label>
            {clienteSel ? (
              <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2">
                <div>
                  <span className="text-sm font-semibold text-zinc-800">{clienteSel.nombre}</span>
                  <span className="ml-2 text-xs font-mono text-zinc-400">{clienteSel.codigo}</span>
                  {clienteSel.telefono && <span className="ml-2 text-xs text-zinc-400">{clienteSel.telefono}</span>}
                </div>
                <button onClick={() => { setClienteId(''); setClienteBusq(''); }} className="text-xs text-zinc-400 hover:text-rose-500">Cambiar</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={clienteBusq}
                  onChange={e => { setClienteBusq(e.target.value); setShowClientes(true); }}
                  onFocus={() => setShowClientes(true)}
                  placeholder="Buscar por nombre, teléfono o código..."
                  className={inp}
                />
                {showClientes && clientesFiltrados.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {clientesFiltrados.slice(0, 20).map(c => (
                      <button key={c.id} onClick={() => { setClienteId(String(c.id)); setClienteBusq(c.nombre); setShowClientes(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 border-b border-zinc-50 last:border-0">
                        <span className="text-sm font-medium text-zinc-800">{c.nombre}</span>
                        <span className="ml-2 text-xs font-mono text-zinc-400">{c.codigo}</span>
                        {c.telefono && <span className="ml-2 text-xs text-zinc-400">{c.telefono}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fecha y medio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Medio de pago</label>
              <select value={medioP} onChange={e => setMedioP(e.target.value)} className={inp}>
                {MEDIOS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Productos */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Productos *</label>
            <div className="space-y-2">
              {detalles.map((d, i) => (
                <ProductoLinea key={i} detalle={d} productos={productos}
                  onChange={(field, val) => setDetalle(i, field, val)}
                  onElegir={prod => elegirProducto(i, prod)}
                  onRemove={detalles.length > 1 ? () => removeLinea(i) : undefined}
                />
              ))}
            </div>
            <button onClick={addLinea}
              className="mt-2 text-xs font-semibold text-[var(--brand-purple)] hover:opacity-75">
              + Agregar línea
            </button>
          </div>

          {/* Envío y notas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Costo de envío</label>
              <input type="number" min="0" placeholder="0" value={envio}
                onChange={e => setEnvio(e.target.value)} className={inp} />
            </div>
            <div className="flex flex-col justify-end">
              <div className="bg-zinc-50 rounded-xl px-3 py-2 text-right">
                <p className="text-xs text-zinc-400">Total</p>
                <p className="text-xl font-bold tabular-nums text-zinc-900">{fmt(total)}</p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              placeholder="Indicaciones de entrega, aclaraciones..."
              className={`${inp} resize-none`} />
          </div>

          {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex gap-2 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Cancelar</button>
          <button onClick={guardar} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-purple)] hover:opacity-90 disabled:opacity-50">
            {saving ? 'Guardando…' : 'Crear pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Línea de producto dentro del modal ───────────────────────────────────────
function ProductoLinea({ detalle, productos, onChange, onElegir, onRemove }: {
  detalle: DetallePedido;
  productos: { id: number; nombre: string; precio_venta: number }[];
  onChange: (field: keyof DetallePedido, val: string | number) => void;
  onElegir: (p: { id: number; nombre: string; precio_venta: number }) => void;
  onRemove?: () => void;
}) {
  const [busq, setBusq]       = useState('');
  const [show, setShow]       = useState(false);
  const filtrados = productos.filter(p =>
    busq === '' || p.nombre.toLowerCase().includes(busq.toLowerCase())
  );

  const inp = 'border border-zinc-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--brand-purple)] bg-white';

  return (
    <div className="flex gap-2 items-start">
      {/* Nombre / buscador */}
      <div className="relative flex-1">
        <input
          value={detalle.nombre_producto || busq}
          onChange={e => {
            setBusq(e.target.value);
            onChange('nombre_producto', e.target.value);
            setShow(true);
          }}
          onFocus={() => setShow(true)}
          placeholder="Nombre del producto"
          className={`${inp} w-full`}
        />
        {show && filtrados.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-36 overflow-y-auto">
            {filtrados.slice(0, 10).map(p => (
              <button key={p.id} onClick={() => { onElegir(p); setBusq(p.nombre); setShow(false); }}
                className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-sm border-b border-zinc-50 last:border-0">
                <span className="text-zinc-800">{p.nombre}</span>
                <span className="ml-2 text-xs text-zinc-400">{fmt(p.precio_venta)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Cantidad */}
      <input type="number" min="0.001" step="0.001" value={detalle.cantidad}
        onChange={e => onChange('cantidad', e.target.value)}
        className={`${inp} w-20 text-center`} placeholder="Cant." />
      {/* Precio */}
      <input type="number" min="0" value={detalle.precio_unitario}
        onChange={e => onChange('precio_unitario', e.target.value)}
        className={`${inp} w-28 text-right`} placeholder="Precio" />
      {/* Subtotal */}
      <span className="text-sm font-semibold text-zinc-700 tabular-nums w-20 text-right pt-2 shrink-0">
        {fmt(detalle.subtotal)}
      </span>
      {onRemove && (
        <button onClick={onRemove} className="text-zinc-300 hover:text-rose-400 pt-2 shrink-0">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
        </button>
      )}
    </div>
  );
}

// ── Modal importar clientes ───────────────────────────────────────────────────
function ModalImportarClientes({ onClose, onImportado }: { onClose: () => void; onImportado: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ creados: number; omitidos: number } | null>(null);
  const [error, setError]     = useState('');

  const importar = async () => {
    if (!archivo) return;
    setLoading(true); setError('');
    const form = new FormData();
    form.append('archivo', archivo);
    try {
      const r = await api.postForm<{ creados: number; omitidos: number }>('/clientes/importar', form);
      setResult(r);
      onImportado();
    } catch (e: any) {
      setError(e?.message ?? 'Error al importar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h3 className="font-bold text-zinc-900">Importar clientes</h3>
          <button onClick={onClose} className="text-zinc-300 hover:text-zinc-500">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="15" y2="15"/><line x1="15" y1="1" x2="1" y2="15"/></svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-zinc-50 rounded-xl px-4 py-3 text-xs text-zinc-500 space-y-1">
            <p className="font-semibold text-zinc-700 mb-1">Formato CSV — columnas:</p>
            <p><span className="font-mono bg-white border border-zinc-200 px-1 rounded">nombre</span> · <span className="font-mono bg-white border border-zinc-200 px-1 rounded">telefono</span> · <span className="font-mono bg-white border border-zinc-200 px-1 rounded">direccion</span> · <span className="font-mono bg-white border border-zinc-200 px-1 rounded">notas</span></p>
            <p className="text-zinc-400">El código se genera automáticamente. Primera fila = cabeceras.</p>
          </div>

          {!result ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Archivo CSV</label>
                <input type="file" accept=".csv,.txt"
                  onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200" />
              </div>
              {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">{error}</p>}
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600">Cancelar</button>
                <button onClick={importar} disabled={!archivo || loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-purple)] hover:opacity-90 disabled:opacity-50">
                  {loading ? 'Importando…' : 'Importar'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-800">
                <p className="font-semibold">Importación completada</p>
                <p>{result.creados} cliente{result.creados !== 1 ? 's' : ''} creados · {result.omitidos} omitidos</p>
              </div>
              <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 text-white">Cerrar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const FILTROS: { id: EstadoPedido | 'todos'; label: string }[] = [
  { id: 'todos',      label: 'Todos' },
  { id: 'pendiente',  label: 'Pendientes' },
  { id: 'confirmado', label: 'Confirmados' },
  { id: 'enviado',    label: 'Enviados' },
  { id: 'entregado',  label: 'Entregados' },
  { id: 'cancelado',  label: 'Cancelados' },
];

export default function PedidosPage() {
  const [pedidos,     setPedidos]     = useState<Pedido[]>([]);
  const [clientes,    setClientes]    = useState<Cliente[]>([]);
  const [productos,   setProductos]   = useState<{ id: number; nombre: string; precio_venta: number }[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filtro,      setFiltro]      = useState<EstadoPedido | 'todos'>('todos');
  const [busq,        setBusq]        = useState('');
  const [selec,       setSelec]       = useState<Pedido | null>(null);
  const [modalNuevo,  setModalNuevo]  = useState(false);
  const [modalImport, setModalImport] = useState(false);
  const [modalWa,     setModalWa]     = useState(false);
  const [waConectado, setWaConectado] = useState<boolean | null>(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtro !== 'todos') params.set('estado', filtro);
    if (busq) params.set('buscar', busq);
    try {
      const [ps, cs, prods] = await Promise.all([
        api.get<Pedido[]>(`/pedidos?${params}`),
        api.get<Cliente[]>('/clientes'),
        api.get<{ data: { id: number; nombre: string; precio_venta: number }[] }>('/productos?per_page=500').then(r => r.data),
      ]);
      setPedidos(ps);
      setClientes(cs);
      setProductos(prods);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filtro, busq]);

  // Check WhatsApp connection status on mount
  useEffect(() => {
    api.get<{ habilitado: boolean; estado: any }>('/whatsapp/status')
      .then(r => {
        const state = r.estado?.instance?.state ?? r.estado?.state ?? 'unknown';
        setWaConectado(r.habilitado && state === 'open');
      })
      .catch(() => setWaConectado(false));
  }, []);

  const avanzar = async (id: number, estado: EstadoPedido, tipoCancelacion?: TipoCancelacion) => {
    try {
      const body: Record<string, unknown> = { estado };
      if (tipoCancelacion) body.tipo_cancelacion = tipoCancelacion;
      const updated = await api.patch<Pedido>(`/pedidos/${id}/estado`, body);
      setPedidos(prev => prev.map(p => p.id === id ? updated : p));
    } catch { /* silent */ }
  };

  const conteo = (e: EstadoPedido | 'todos') =>
    e === 'todos' ? pedidos.length : pedidos.filter(p => p.estado === e).length;

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center gap-3 shrink-0 flex-wrap gap-y-2">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Pedidos</h1>
          <p className="text-xs text-zinc-400">Gestión de envíos y entregas</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <input
            type="text" placeholder="Buscar cliente..." value={busq}
            onChange={e => setBusq(e.target.value)}
            className="text-sm border border-zinc-200 rounded-xl px-3 py-1.5 w-44 focus:outline-none focus:border-[var(--brand-purple)] bg-white"
          />
          <button onClick={() => setModalImport(true)}
            className="px-3 py-1.5 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
            Importar clientes
          </button>
          <button onClick={() => setModalWa(true)} title="Configurar WhatsApp"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
              waConectado === true
                ? 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                : 'border-zinc-200 text-zinc-400 hover:bg-zinc-50'
            }`}>
            <WaIcon size={14} />
            {waConectado === true ? 'Activo' : 'WhatsApp'}
          </button>
          <button onClick={() => setModalNuevo(true)}
            className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-[var(--brand-purple)] text-white hover:opacity-90">
            + Nuevo pedido
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border-b border-zinc-100 px-6 flex gap-1 shrink-0 overflow-x-auto">
        {FILTROS.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              filtro === f.id
                ? 'border-[var(--brand-purple)] text-[var(--brand-purple)]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}>
            {f.label}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${filtro === f.id ? 'bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]' : 'bg-zinc-100 text-zinc-400'}`}>
              {conteo(f.id)}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-sm text-zinc-400">
            <span className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
            Cargando…
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-sm text-zinc-400">No hay pedidos{filtro !== 'todos' ? ' en este estado' : ''}.</p>
            <button onClick={() => setModalNuevo(true)}
              className="mt-3 text-sm font-semibold text-[var(--brand-purple)] hover:opacity-75">
              + Crear primer pedido
            </button>
          </div>
        ) : (
          pedidos.map(p => {
            const cfg = ESTADO_CFG[p.estado];
            return (
              <div key={p.id} onClick={() => setSelec(p)}
                className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 flex items-center gap-4 hover:border-zinc-200 hover:shadow-md transition-all cursor-pointer">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-800">{p.cliente.nombre}</p>
                    <Pill color={cfg.pill}>{cfg.label}</Pill>
                    <span className="text-xs font-mono text-zinc-300">{p.numero}</span>
                    <WaBadge enviado={p.whatsapp_enviado} />
                  </div>
                  {p.cliente.direccion && <p className="text-xs text-zinc-400 truncate">{p.cliente.direccion}</p>}
                  <p className="text-xs text-zinc-300 mt-0.5">{p.detalles.length} línea{p.detalles.length !== 1 ? 's' : ''} · {fmtDate(p.fecha)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums text-zinc-800">{fmt(p.total)}</p>
                  {p.costo_envio > 0 && <p className="text-xs text-zinc-400">+{fmt(p.costo_envio)} envío</p>}
                  {p.medio_pago && <p className="text-xs text-zinc-300 capitalize">{p.medio_pago}</p>}
                </div>
                {cfg.next && (
                  <button onClick={e => { e.stopPropagation(); avanzar(p.id, cfg.next!); }}
                    className="ml-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-600 hover:bg-[var(--brand-purple)] hover:text-white transition-colors whitespace-nowrap">
                    {cfg.nextLabel}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modales */}
      {selec && <ModalDetalle pedido={selec} onClose={() => setSelec(null)} onAvanzar={avanzar} />}

      {modalNuevo && (
        <ModalNuevoPedido
          onClose={() => setModalNuevo(false)}
          onCreado={p => { setPedidos(prev => [p, ...prev]); setModalNuevo(false); }}
          clientes={clientes}
          productos={productos}
        />
      )}

      {modalImport && (
        <ModalImportarClientes
          onClose={() => setModalImport(false)}
          onImportado={() => api.get<Cliente[]>('/clientes').then(setClientes).catch(() => {})}
        />
      )}

      {modalWa && (
        <ModalWhatsappSetup onClose={() => setModalWa(false)} />
      )}
    </div>
  );
}
