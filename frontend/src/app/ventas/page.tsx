'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { api, type Producto, type Venta, type VentasPaginado } from '@/lib/api';
import Modal from '@/components/Modal';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface LineaCarrito {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
}

type Vista = 'pos' | 'historial';

type MedioPago = 'efectivo' | 'tarjeta' | 'oca' | 'transferencia' | 'otro';

const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'tarjeta',       label: 'Tarjeta' },
  { value: 'oca',           label: 'OCA' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'otro',          label: 'Otro' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function VentasPage() {
  const [vista, setVista] = useState<Vista>('pos');

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-5 pt-5 pb-0 border-b border-zinc-100 bg-white">
        {(['pos', 'historial'] as Vista[]).map(v => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              vista === v
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {v === 'pos' ? 'Nueva venta' : 'Historial'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto bg-slate-50">
        {vista === 'pos' ? <POSPanel /> : <HistorialPanel />}
      </div>
    </div>
  );
}

// ─── Panel POS ────────────────────────────────────────────────────────────────

function POSPanel() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [tipoPago, setTipoPago] = useState<'contado' | 'credito'>('contado');
  const [medioPago, setMedioPago] = useState<MedioPago>('efectivo');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);   // mobile: cart drawer
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Producto[]>('/productos').then(setProductos);
    searchRef.current?.focus();
  }, []);

  // Filtrado en tiempo real (sin llamada al servidor)
  useEffect(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) { setResultados([]); return; }
    const matches = productos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.codigo_barras ?? '').toLowerCase().includes(q) ||
      (p.marca ?? '').toLowerCase().includes(q)
    ).slice(0, 12);
    setResultados(matches);
  }, [busqueda, productos]);

  const agregarAlCarrito = useCallback((p: Producto) => {
    setCarrito(prev => {
      const existente = prev.find(l => l.producto.id === p.id);
      if (existente) {
        return prev.map(l =>
          l.producto.id === p.id
            ? { ...l, cantidad: l.cantidad + 1 }
            : l
        );
      }
      return [...prev, { producto: p, cantidad: 1, precio_unitario: p.precio_venta }];
    });
    setBusqueda('');
    setResultados([]);
    searchRef.current?.focus();
  }, []);

  const cambiarCantidad = (id: number, delta: number) => {
    setCarrito(prev =>
      prev
        .map(l => l.producto.id === id ? { ...l, cantidad: l.cantidad + delta } : l)
        .filter(l => l.cantidad > 0)
    );
  };

  const cambiarPrecio = (id: number, precio: string) => {
    const val = parseFloat(precio);
    if (isNaN(val) || val < 0) return;
    setCarrito(prev => prev.map(l => l.producto.id === id ? { ...l, precio_unitario: val } : l));
  };

  const vaciarCarrito = () => { setCarrito([]); setError(''); };

  const total = carrito.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);

  const confirmarVenta = async () => {
    if (carrito.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post<Venta>('/ventas', {
        fecha: new Date().toISOString().slice(0, 10),
        tipo_pago: tipoPago,
        medio_pago: medioPago,
        detalles: carrito.map(l => ({
          producto_id:     l.producto.id,
          cantidad:        l.cantidad,
          precio_unitario: l.precio_unitario,
        })),
      });
      setSuccess(`Venta de $${total.toLocaleString('es-CL')} registrada correctamente.`);
      setCarrito([]);
      setCartOpen(false);
      // Actualizar stock en los productos cargados
      api.get<Producto[]>('/productos').then(setProductos);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = carrito.reduce((s, l) => s + l.cantidad, 0);

  return (
    <div className="flex h-full min-h-screen">
      {/* ── Left: búsqueda y resultados ── */}
      <div className="flex-1 flex flex-col p-4 lg:p-6 min-w-0">

        {/* Notificaciones */}
        {success && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 8 5 12 15 4" />
            </svg>
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {/* Barra de búsqueda */}
        <div className="relative mb-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16"
                fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6.5" cy="6.5" r="5.5" />
                <line x1="11" y1="11" x2="15" y2="15" />
              </svg>
              <input
                ref={searchRef}
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar producto por nombre o código…"
                className="w-full pl-9 pr-4 py-3 text-sm border border-zinc-200 rounded-2xl bg-white focus:outline-none focus:border-zinc-400 shadow-sm"
              />
            </div>

            {/* Botón cámara — placeholder para escáner futuro */}
            <button
              title="Escanear código de barras (próximamente)"
              onClick={() => alert('Escáner de código de barras: próximamente disponible en versión móvil.')}
              className="w-12 h-12 flex items-center justify-center bg-white border border-zinc-200 rounded-2xl text-zinc-400 hover:text-zinc-700 hover:border-zinc-400 transition-colors shadow-sm"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7V4a1 1 0 0 1 1-1h3M18 7V4a1 1 0 0 0-1-1h-3M2 13v3a1 1 0 0 0 1 1h3M18 13v3a1 1 0 0 1-1 1h-3" />
                <rect x="6" y="7" width="8" height="6" rx="1" />
              </svg>
            </button>
          </div>

          {/* Dropdown resultados */}
          {resultados.length > 0 && (
            <div className="absolute top-full left-0 right-14 mt-1 bg-white border border-zinc-100 rounded-2xl shadow-lg z-10 overflow-hidden">
              {resultados.map(p => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 text-left transition-colors border-b border-zinc-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{p.nombre}</p>
                    <p className="text-xs text-zinc-400">{p.marca ?? ''} {p.codigo_barras ? `· ${p.codigo_barras}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold text-zinc-900">${p.precio_venta.toLocaleString('es-CL')}</p>
                    <p className={`text-xs ${p.stock <= 0 ? 'text-rose-500' : p.stock <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      stock: {p.stock} {p.unidad_medida}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid de productos recientes (cuando no hay búsqueda activa) */}
        {busqueda === '' && (
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Productos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {productos.slice(0, 20).map(p => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  disabled={p.stock <= 0}
                  className={`text-left p-3 bg-white border rounded-2xl transition-all ${
                    p.stock <= 0
                      ? 'opacity-40 cursor-not-allowed border-zinc-100'
                      : 'border-zinc-100 hover:border-zinc-300 hover:shadow-sm active:scale-95'
                  }`}
                >
                  <p className="text-xs font-medium text-zinc-800 leading-snug line-clamp-2 mb-2">{p.nombre}</p>
                  <p className="text-sm font-bold text-zinc-900">${p.precio_venta.toLocaleString('es-CL')}</p>
                  <p className={`text-[10px] mt-0.5 ${p.stock <= 0 ? 'text-rose-500' : p.stock <= 5 ? 'text-amber-500' : 'text-zinc-400'}`}>
                    {p.stock <= 0 ? 'Sin stock' : `${p.stock} ${p.unidad_medida}`}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Carrito (desktop) ── */}
      <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-white border-l border-zinc-100 shrink-0">
        <CarritoPanel
          carrito={carrito}
          total={total}
          tipoPago={tipoPago}
          medioPago={medioPago}
          submitting={submitting}
          onCambiarCantidad={cambiarCantidad}
          onCambiarPrecio={cambiarPrecio}
          onVaciar={vaciarCarrito}
          onTipoPago={setTipoPago}
          onMedioPago={(v) => setMedioPago(v as MedioPago)}
          onConfirmar={confirmarVenta}
        />
      </div>

      {/* ── Mobile: botón flotante del carrito ── */}
      {carrito.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-5 right-5 z-20 bg-zinc-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium"
        >
          <span className="bg-emerald-400 text-zinc-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {totalItems}
          </span>
          Ver carrito · ${total.toLocaleString('es-CL')}
        </button>
      )}

      {/* ── Mobile: modal carrito ── */}
      <Modal isOpen={cartOpen} onClose={() => setCartOpen(false)} title="Carrito" size="md">
        <CarritoPanel
          carrito={carrito}
          total={total}
          tipoPago={tipoPago}
          medioPago={medioPago}
          submitting={submitting}
          onCambiarCantidad={cambiarCantidad}
          onCambiarPrecio={cambiarPrecio}
          onVaciar={vaciarCarrito}
          onTipoPago={setTipoPago}
          onMedioPago={(v) => setMedioPago(v as MedioPago)}
          onConfirmar={() => { confirmarVenta(); setCartOpen(false); }}
        />
      </Modal>
    </div>
  );
}

// ─── Carrito ──────────────────────────────────────────────────────────────────

interface CarritoPanelProps {
  carrito: LineaCarrito[];
  total: number;
  tipoPago: 'contado' | 'credito';
  medioPago: string;
  submitting: boolean;
  onCambiarCantidad: (id: number, delta: number) => void;
  onCambiarPrecio: (id: number, precio: string) => void;
  onVaciar: () => void;
  onTipoPago: (v: 'contado' | 'credito') => void;
  onMedioPago: (v: string) => void;
  onConfirmar: () => void;
}

function CarritoPanel({
  carrito, total, tipoPago, medioPago, submitting,
  onCambiarCantidad, onCambiarPrecio, onVaciar, onTipoPago, onMedioPago, onConfirmar,
}: CarritoPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <span className="text-sm font-semibold text-zinc-900">Carrito</span>
        {carrito.length > 0 && (
          <button onClick={onVaciar} className="text-xs text-zinc-400 hover:text-rose-500 transition-colors">
            Vaciar
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {carrito.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-zinc-300 text-3xl mb-2">—</p>
            <p className="text-sm text-zinc-400">Buscá un producto para agregarlo</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {carrito.map(l => (
              <div key={l.producto.id} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 leading-tight">{l.producto.nombre}</p>
                  {/* Precio editable */}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-zinc-400">$</span>
                    <input
                      type="number"
                      value={l.precio_unitario}
                      onChange={e => onCambiarPrecio(l.producto.id, e.target.value)}
                      className="w-20 text-xs border border-zinc-200 rounded-lg px-1.5 py-0.5 focus:outline-none focus:border-zinc-400"
                    />
                    <span className="text-xs text-zinc-400">c/u</span>
                  </div>
                </div>
                {/* Controles cantidad */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onCambiarCantidad(l.producto.id, -1)}
                    className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium transition-colors"
                  >−</button>
                  <span className="w-7 text-center text-sm font-semibold tabular-nums">{l.cantidad}</span>
                  <button
                    onClick={() => onCambiarCantidad(l.producto.id, 1)}
                    className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium transition-colors"
                  >+</button>
                </div>
                {/* Subtotal */}
                <span className="text-sm font-semibold text-zinc-800 tabular-nums w-20 text-right shrink-0">
                  ${(l.cantidad * l.precio_unitario).toLocaleString('es-CL')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: pago + confirmar */}
      <div className="px-4 py-4 border-t border-zinc-100 space-y-3">
        {/* Tipo de pago */}
        <div className="flex gap-2">
          {(['contado', 'credito'] as const).map(t => (
            <button
              key={t}
              onClick={() => onTipoPago(t)}
              className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-colors ${
                tipoPago === t
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              {t === 'contado' ? 'Contado' : 'Crédito'}
            </button>
          ))}
        </div>

        {/* Medio de pago */}
        <div className="grid grid-cols-3 gap-1.5">
          {MEDIOS_PAGO.map(m => (
            <button
              key={m.value}
              onClick={() => onMedioPago(m.value)}
              className={`py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                medioPago === m.value
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-baseline justify-between py-1">
          <span className="text-sm text-zinc-500">Total</span>
          <span className="text-2xl font-bold text-zinc-900 tabular-nums">
            ${total.toLocaleString('es-CL')}
          </span>
        </div>

        {/* Confirmar */}
        <button
          onClick={onConfirmar}
          disabled={carrito.length === 0 || submitting}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base rounded-2xl transition-colors shadow-sm"
        >
          {submitting ? 'Procesando…' : 'Confirmar venta'}
        </button>
      </div>
    </div>
  );
}

// ─── Historial ────────────────────────────────────────────────────────────────

function HistorialPanel() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<Venta | null>(null);
  const [anulando, setAnulando] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.get<VentasPaginado>('/ventas').then(r => { setVentas(r.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const verDetalle = async (id: number) => {
    const v = await api.get<Venta>(`/ventas/${id}`);
    setDetalle(v);
  };

  const anularVenta = async (id: number) => {
    if (!confirm('¿Anular esta venta? Se revertirá el stock.')) return;
    setAnulando(id);
    try {
      await api.patch(`/ventas/${id}/anular`, {});
      load();
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setAnulando(null);
    }
  };

  return (
    <div className="p-5 lg:p-8 max-w-5xl">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-zinc-900">Historial de ventas</h2>
        <p className="text-sm text-zinc-400 mt-0.5">{ventas.length} ventas registradas</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  {['#', 'Fecha', 'Tipo pago', 'Medio', 'Total', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.id} className={`border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors ${v.estado === 'anulada' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">#{v.id}</td>
                    <td className="px-4 py-3 text-zinc-600 tabular-nums">{new Date(v.fecha).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${v.tipo_pago === 'contado' ? 'bg-zinc-100 text-zinc-600' : 'bg-blue-50 text-blue-600'}`}>
                        {v.tipo_pago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 capitalize text-xs">{v.medio_pago ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">${v.total.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${v.estado === 'confirmada' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                        {v.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button onClick={() => verDetalle(v.id)} className="text-zinc-500 hover:text-zinc-800 text-xs transition-colors">
                        Detalle
                      </button>
                      {v.estado === 'confirmada' && (
                        <button
                          onClick={() => anularVenta(v.id)}
                          disabled={anulando === v.id}
                          className="text-rose-400 hover:text-rose-600 text-xs transition-colors disabled:opacity-50"
                        >
                          {anulando === v.id ? '…' : 'Anular'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {ventas.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-zinc-400">Sin ventas registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {detalle && (
        <Modal isOpen={!!detalle} onClose={() => setDetalle(null)} title={`Venta #${detalle.id}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Fecha',     new Date(detalle.fecha).toLocaleDateString('es-CL')],
                ['Total',     `$${detalle.total.toLocaleString('es-CL')}`],
                ['Tipo pago', detalle.tipo_pago],
                ['Medio',     detalle.medio_pago ?? '—'],
                ['Estado',    detalle.estado],
                ['Moneda',    detalle.moneda],
              ].map(([k, v]) => (
                <div key={k} className="bg-zinc-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-zinc-400 mb-0.5">{k}</p>
                  <p className="text-zinc-800 font-medium capitalize">{v}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    {['Producto', 'Cant.', 'Precio', 'Subtotal'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalle.detalles?.map(d => (
                    <tr key={d.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-3 py-2.5 text-zinc-800">{d.producto?.nombre}</td>
                      <td className="px-3 py-2.5 tabular-nums">{d.cantidad}</td>
                      <td className="px-3 py-2.5 tabular-nums">${d.precio_unitario.toLocaleString('es-CL')}</td>
                      <td className="px-3 py-2.5 tabular-nums font-medium">${d.subtotal.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detalle.kitfe_id && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-xs text-emerald-700">
                Sincronizado con Kitfe · ID: {detalle.kitfe_id}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
