'use client';

import { useEffect, useState, useRef } from 'react';
import { api, type Cliente, type Pedido, type EstadoPedido, type DetallePedido } from '@/lib/api';

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' });

// ── Configuración de estados ──────────────────────────────────────────────────
const ESTADO_CFG: Record<EstadoPedido, { label: string; pill: string; dot: string; next?: EstadoPedido; nextLabel?: string }> = {
  pendiente:  { label: 'Pendiente',  pill: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-400',   next: 'confirmado', nextLabel: 'Confirmar' },
  confirmado: { label: 'Confirmado', pill: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-400',    next: 'enviado',    nextLabel: 'Marcar enviado' },
  enviado:    { label: 'Enviado',    pill: 'bg-violet-100 text-violet-700',  dot: 'bg-violet-400',  next: 'entregado',  nextLabel: 'Confirmar entrega' },
  entregado:  { label: 'Entregado', pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  cancelado:  { label: 'Cancelado', pill: 'bg-zinc-100 text-zinc-500',       dot: 'bg-zinc-300'     },
};

const MEDIOS = ['efectivo','tarjeta','transferencia','oca','master','anda','cabal','otro'];

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{children}</span>;
}

// ── Modal detalle pedido ──────────────────────────────────────────────────────
function ModalDetalle({ pedido, onClose, onAvanzar }: {
  pedido: Pedido;
  onClose: () => void;
  onAvanzar: (id: number, e: EstadoPedido) => void;
}) {
  const cfg = ESTADO_CFG[pedido.estado];
  return (
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
        </div>
        {cfg.next && (
          <div className="px-5 py-4 border-t border-zinc-100 flex gap-2">
            <button onClick={() => { onAvanzar(pedido.id, cfg.next!); onClose(); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[var(--brand-purple)] text-white hover:opacity-90">
              {cfg.nextLabel}
            </button>
            <button onClick={() => { onAvanzar(pedido.id, 'cancelado'); onClose(); }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200 text-zinc-500 hover:border-rose-200 hover:text-rose-600">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
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

  const avanzar = async (id: number, estado: EstadoPedido) => {
    try {
      const updated = await api.patch<Pedido>(`/pedidos/${id}/estado`, { estado });
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
    </div>
  );
}
