'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { api, type Categoria, type FraccionarResult, type Producto, type Venta, type VentasPaginado } from '@/lib/api';
import Modal from '@/components/Modal';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface LineaCarrito {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
}

type Vista = 'pos' | 'historial';

type MedioPago = 'efectivo' | 'tarjeta' | 'oca' | 'transferencia' | 'otro';

const MEDIOS_PAGO: { value: MedioPago; label: string; icon: React.ReactNode }[] = [
  {
    value: 'efectivo', label: 'Efectivo',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="16" height="10" rx="2"/><circle cx="9" cy="9" r="2.5"/></svg>,
  },
  {
    value: 'tarjeta', label: 'Tarjeta',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="16" height="10" rx="2"/><line x1="1" y1="8" x2="17" y2="8"/></svg>,
  },
  {
    value: 'oca', label: 'OCA',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="7"/><path d="M6 9h6M9 6v6"/></svg>,
  },
  {
    value: 'transferencia', label: 'Transf.',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h12M11 5l4 4-4 4"/></svg>,
  },
  {
    value: 'otro', label: 'Otro',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="1"/><circle cx="4" cy="9" r="1"/><circle cx="14" cy="9" r="1"/></svg>,
  },
];

function fmt(n: number) {
  return `$${n.toLocaleString('es-CL', { minimumFractionDigits: 0 })}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VentasPage() {
  const [vista, setVista] = useState<Vista>('pos');

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center px-4 pt-4 gap-1 bg-white border-b border-zinc-100 shrink-0">
        {(['pos', 'historial'] as Vista[]).map(v => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`relative px-5 py-2.5 text-sm font-medium rounded-t-xl transition-colors ${
              vista === v
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
            style={vista === v ? { background: 'var(--brand-purple)' } : {}}
          >
            {v === 'pos' ? (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2H2v4M6 12H2v-4M18 2h-4v4M18 12h-4v-4M2 7h16"/>
                </svg>
                Nueva venta
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h18v18H3zM8 3v18M3 9h18M3 15h18"/>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="8" y1="3" x2="8" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/>
                </svg>
                Historial
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50">
        {vista === 'pos' ? <POSPanel /> : <HistorialPanel />}
      </div>
    </div>
  );
}

// ─── Panel POS ────────────────────────────────────────────────────────────────

function POSPanel() {
  const [productos, setProductos]     = useState<Producto[]>([]);
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [catActiva, setCatActiva]     = useState<number | null>(null);
  const [busqueda, setBusqueda]       = useState('');
  const [carrito, setCarrito]         = useState<LineaCarrito[]>([]);
  const [tipoPago, setTipoPago]       = useState<'contado' | 'credito'>('contado');
  const [medioPago, setMedioPago]     = useState<MedioPago>('efectivo');
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [cartOpen, setCartOpen]         = useState(false);
  const [addedId, setAddedId]           = useState<number | null>(null);
  const [fraccionando, setFraccionando] = useState<Producto | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const recargarProductos = useCallback(() => {
    api.get<Producto[]>('/productos').then(setProductos);
  }, []);

  useEffect(() => {
    recargarProductos();
    api.get<Categoria[]>('/categorias').then(setCategorias);
    searchRef.current?.focus();
  }, [recargarProductos]);

  // Productos filtrados
  const productosFiltrados = (() => {
    let lista = productos.filter(p => p.activo);
    if (catActiva) lista = lista.filter(p => p.categoria_id === catActiva);
    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_barras ?? '').toLowerCase().includes(q) ||
        (p.marca ?? '').toLowerCase().includes(q) ||
        String(p.precio_venta).includes(q)
      );
    }
    return lista;
  })();

  const agregarAlCarrito = useCallback((p: Producto) => {
    setCarrito(prev => {
      const existente = prev.find(l => l.producto.id === p.id);
      if (existente) {
        return prev.map(l => l.producto.id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l);
      }
      return [...prev, { producto: p, cantidad: 1, precio_unitario: p.precio_venta }];
    });
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 600);
    setBusqueda('');
    searchRef.current?.focus();
  }, []);

  const cambiarCantidad = (id: number, delta: number) => {
    setCarrito(prev =>
      prev.map(l => l.producto.id === id ? { ...l, cantidad: l.cantidad + delta } : l)
          .filter(l => l.cantidad > 0)
    );
  };

  const quitarItem = (id: number) => setCarrito(prev => prev.filter(l => l.producto.id !== id));

  const cambiarPrecio = (id: number, precio: string) => {
    const val = parseFloat(precio);
    if (isNaN(val) || val < 0) return;
    setCarrito(prev => prev.map(l => l.producto.id === id ? { ...l, precio_unitario: val } : l));
  };

  const vaciarCarrito = () => { setCarrito([]); setError(''); };

  const total     = carrito.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);
  const totalItems = carrito.reduce((s, l) => s + l.cantidad, 0);

  const confirmarVenta = async () => {
    if (carrito.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post<Venta>('/ventas', {
        fecha:      new Date().toISOString().slice(0, 10),
        tipo_pago:  tipoPago,
        medio_pago: medioPago,
        detalles:   carrito.map(l => ({
          producto_id:     l.producto.id,
          cantidad:        l.cantidad,
          precio_unitario: l.precio_unitario,
        })),
      });
      setSuccess(`Venta registrada · ${fmt(total)}`);
      setCarrito([]);
      setCartOpen(false);
      recargarProductos();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: productos ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Búsqueda + filtros */}
        <div className="px-4 pt-4 pb-3 bg-white border-b border-zinc-100 space-y-3 shrink-0">

          {/* Toasts */}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-2.5 rounded-xl">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 8 6 13 15 4"/></svg>
              {success}
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>
          )}

          {/* Barra de búsqueda */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6.5" cy="6.5" r="5.5"/><line x1="11" y1="11" x2="15" y2="15"/>
              </svg>
              <input
                ref={searchRef}
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setCatActiva(null); }}
                placeholder="Buscar por nombre, código, precio…"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[var(--brand-purple)] focus:bg-white transition-colors"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
                </button>
              )}
            </div>
            <button
              title="Escanear código de barras (próximamente)"
              onClick={() => alert('Escáner: próximamente disponible.')}
              className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-zinc-200 rounded-xl text-zinc-400 hover:text-[var(--brand-purple)] hover:border-[var(--brand-purple)] transition-colors shrink-0"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7V4a1 1 0 0 1 1-1h3M18 7V4a1 1 0 0 0-1-1h-3M2 13v3a1 1 0 0 0 1 1h3M18 13v3a1 1 0 0 1-1 1h-3"/>
                <rect x="6" y="7" width="8" height="6" rx="1"/>
              </svg>
            </button>
          </div>

          {/* Categorías */}
          {!busqueda && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setCatActiva(null)}
                className={`shrink-0 px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  catActiva === null
                    ? 'text-white border-transparent'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                }`}
                style={catActiva === null ? { background: 'var(--brand-purple)' } : {}}
              >
                Todos
              </button>
              {categorias.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCatActiva(catActiva === c.id ? null : c.id)}
                  className={`shrink-0 px-3 py-1 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    catActiva === c.id
                      ? 'text-white border-transparent'
                      : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                  }`}
                  style={catActiva === c.id ? { background: 'var(--brand-purple)' } : {}}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto p-4 pb-28 lg:pb-4">
          {productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <svg className="text-zinc-300 mb-2" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="14"/><line x1="10" y1="10" x2="26" y2="26"/>
              </svg>
              <p className="text-sm text-zinc-400">Sin resultados para &ldquo;{busqueda || 'esta categoría'}&rdquo;</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-400 mb-3">
                {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
                {catActiva && ` · ${categorias.find(c => c.id === catActiva)?.nombre}`}
                {busqueda && ` · "${busqueda}"`}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                {productosFiltrados.map(p => {
                  const agotado        = p.stock <= 0;
                  const stockBajo      = !agotado && p.stock <= 5;
                  const added          = addedId === p.id;
                  const esFraccionado  = !!p.fraccionado_de;
                  const puedeFraccionar = !agotado && (p.peso ?? 0) > 0 && !esFraccionado;
                  return (
                    <div
                      key={p.id}
                      className={`relative flex flex-col rounded-2xl border transition-all duration-150 ${
                        agotado
                          ? 'opacity-40 bg-white border-zinc-100'
                          : esFraccionado
                          ? 'bg-amber-50/50 border-amber-200'
                          : added
                          ? 'border-[var(--brand-teal)] bg-[var(--brand-teal)]/5'
                          : 'bg-white border-zinc-100 hover:border-[var(--brand-purple)]/40 hover:shadow-md'
                      }`}
                    >
                      {/* Badge fraccionado */}
                      {esFraccionado && (
                        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-white">
                          FRAC.
                        </span>
                      )}
                      {added && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: 'var(--brand-teal)' }}>✓</span>
                      )}
                      {stockBajo && !added && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
                      )}

                      {/* Cuerpo: toca para agregar al carrito */}
                      <button
                        onClick={() => !agotado && agregarAlCarrito(p)}
                        disabled={agotado}
                        className="flex-1 text-left p-3.5 pb-2 active:scale-95 transition-transform disabled:cursor-not-allowed"
                      >
                        <p className="text-xs font-semibold text-zinc-800 leading-snug line-clamp-2 mb-2 min-h-[2.5rem]">
                          {p.nombre}
                        </p>
                        {p.marca && (
                          <p className="text-[10px] text-zinc-400 mb-1.5 truncate">{p.marca}</p>
                        )}
                        <p className="text-base font-bold tabular-nums" style={{ color: 'var(--brand-purple)' }}>
                          {fmt(p.precio_venta)}
                          {esFraccionado && <span className="text-[10px] font-normal text-amber-600 ml-1">/kg</span>}
                        </p>
                        <p className={`text-[10px] mt-0.5 font-medium ${
                          agotado ? 'text-rose-500' : stockBajo ? 'text-amber-500' : 'text-zinc-400'
                        }`}>
                          {agotado ? 'Sin stock' : `${p.stock} ${p.unidad_medida}`}
                          {esFraccionado && !agotado && <span className="text-zinc-300"> · frac.</span>}
                        </p>
                      </button>

                      {/* Botón fraccionar */}
                      {puedeFraccionar && (
                        <button
                          onClick={() => setFraccionando(p)}
                          title={`Fraccionar bolsa (${p.peso} kg/bolsa)`}
                          className="flex items-center justify-center gap-1 py-1.5 border-t border-zinc-100 text-[10px] font-semibold text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-b-2xl transition-colors"
                        >
                          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M7 1L1 7M1 1l6 6"/><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                          </svg>
                          Fraccionar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Right: Carrito desktop ── */}
      <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-white border-l border-zinc-100 shrink-0">
        <CarritoPanel
          carrito={carrito}
          total={total}
          tipoPago={tipoPago}
          medioPago={medioPago}
          submitting={submitting}
          onCambiarCantidad={cambiarCantidad}
          onCambiarPrecio={cambiarPrecio}
          onQuitarItem={quitarItem}
          onVaciar={vaciarCarrito}
          onTipoPago={setTipoPago}
          onMedioPago={(v) => setMedioPago(v as MedioPago)}
          onConfirmar={confirmarVenta}
        />
      </div>

      {/* ── Mobile: barra inferior ── */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-zinc-200 px-3 py-3 flex gap-2 transition-all duration-200 ${
        carrito.length === 0 ? 'translate-y-full pointer-events-none' : 'translate-y-0'
      }`}>
        <button
          onClick={() => setCartOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shrink-0"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            style={{ background: 'var(--brand-purple)' }}>
            {totalItems}
          </span>
        </button>
        <button
          onClick={confirmarVenta}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40 transition-all active:scale-95"
          style={{ background: 'var(--brand-teal)' }}
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Confirmar · {fmt(total)}
            </>
          )}
        </button>
      </div>

      {/* ── Modal fraccionamiento ── */}
      {fraccionando && (
        <FraccionarModal
          producto={fraccionando}
          onClose={() => setFraccionando(null)}
          onDone={(resultado) => {
            setFraccionando(null);
            recargarProductos();
            setSuccess(`✓ ${resultado.unidades_generadas} kg generados · código ${resultado.codigo_fraccionado}`);
            setTimeout(() => setSuccess(''), 5000);
          }}
        />
      )}

      {/* ── Mobile: modal carrito ── */}
      <Modal isOpen={cartOpen} onClose={() => setCartOpen(false)} title="Carrito" size="md" noPadding>
        <CarritoPanel
          carrito={carrito}
          total={total}
          tipoPago={tipoPago}
          medioPago={medioPago}
          submitting={submitting}
          onCambiarCantidad={cambiarCantidad}
          onCambiarPrecio={cambiarPrecio}
          onQuitarItem={quitarItem}
          onVaciar={vaciarCarrito}
          onTipoPago={setTipoPago}
          onMedioPago={(v) => setMedioPago(v as MedioPago)}
          onConfirmar={() => { confirmarVenta(); }}
        />
      </Modal>
    </div>
  );
}

// ─── Carrito Panel ─────────────────────────────────────────────────────────────

interface CarritoPanelProps {
  carrito:           LineaCarrito[];
  total:             number;
  tipoPago:          'contado' | 'credito';
  medioPago:         string;
  submitting:        boolean;
  onCambiarCantidad: (id: number, delta: number) => void;
  onCambiarPrecio:   (id: number, precio: string) => void;
  onQuitarItem:      (id: number) => void;
  onVaciar:          () => void;
  onTipoPago:        (v: 'contado' | 'credito') => void;
  onMedioPago:       (v: string) => void;
  onConfirmar:       () => void;
}

function CarritoPanel({
  carrito, total, tipoPago, medioPago, submitting,
  onCambiarCantidad, onCambiarPrecio, onQuitarItem, onVaciar, onTipoPago, onMedioPago, onConfirmar,
}: CarritoPanelProps) {
  const totalItems = carrito.reduce((s, l) => s + l.cantidad, 0);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span className="text-sm font-semibold text-zinc-900">Carrito</span>
          {totalItems > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: 'var(--brand-purple)' }}>
              {totalItems}
            </span>
          )}
        </div>
        {carrito.length > 0 && (
          <button onClick={onVaciar} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-500 transition-colors">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Vaciar
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {carrito.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 px-6 text-center">
            <svg className="text-zinc-200 mb-3" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="21" r="1.5"/><circle cx="29" cy="21" r="1.5"/>
              <path d="M2 3h5l3.68 15.39a2 2 0 0 0 2 1.61h11.72a2 2 0 0 0 2-1.61L34 9H9"/>
            </svg>
            <p className="text-sm text-zinc-400">Seleccioná productos para agregar al carrito</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {carrito.map(l => (
              <div key={l.producto.id} className="px-4 py-3 flex items-start gap-3 group hover:bg-zinc-50/50 transition-colors">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 leading-snug line-clamp-2">{l.producto.nombre}</p>
                  {/* Precio editable */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-xs text-zinc-400">$</span>
                    <input
                      type="number"
                      value={l.precio_unitario}
                      onChange={e => onCambiarPrecio(l.producto.id, e.target.value)}
                      className="w-20 text-xs border border-zinc-200 rounded-lg px-1.5 py-0.5 focus:outline-none focus:border-[var(--brand-purple)] tabular-nums"
                    />
                    <span className="text-xs text-zinc-400">c/u</span>
                  </div>
                </div>
                {/* Controles cantidad */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onCambiarCantidad(l.producto.id, -1)}
                      className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold transition-colors flex items-center justify-center text-base leading-none"
                    >−</button>
                    <span className="w-7 text-center text-sm font-bold tabular-nums text-zinc-900">{l.cantidad}</span>
                    <button
                      onClick={() => onCambiarCantidad(l.producto.id, 1)}
                      className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold transition-colors flex items-center justify-center text-base leading-none"
                    >+</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-zinc-700">
                      {fmt(l.cantidad * l.precio_unitario)}
                    </span>
                    <button
                      onClick={() => onQuitarItem(l.producto.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-rose-400 transition-all"
                      title="Quitar"
                    >
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="1" y1="1" x2="12" y2="12"/><line x1="12" y1="1" x2="1" y2="12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-5 pt-4 border-t border-zinc-100 space-y-3 shrink-0">

        {/* Tipo pago (toggle) */}
        <div className="flex bg-zinc-100 p-0.5 rounded-xl">
          {(['contado', 'credito'] as const).map(t => (
            <button
              key={t}
              onClick={() => onTipoPago(t)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-[10px] transition-colors ${
                tipoPago === t
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t === 'contado' ? (
                <span className="flex items-center justify-center gap-1.5">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  Contado
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                  Crédito
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Medio de pago */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Medio de pago</p>
          <div className="grid grid-cols-5 gap-1">
            {MEDIOS_PAGO.map(m => (
              <button
                key={m.value}
                onClick={() => onMedioPago(m.value)}
                title={m.label}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
                  medioPago === m.value
                    ? 'text-white border-transparent'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                }`}
                style={medioPago === m.value ? { background: 'var(--brand-teal)', borderColor: 'var(--brand-teal)' } : {}}
              >
                {m.icon}
                <span className="text-[9px] leading-none">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-baseline justify-between py-1 px-1">
          <span className="text-sm text-zinc-500 font-medium">Total</span>
          <span className="text-2xl font-bold tabular-nums text-zinc-900">
            {fmt(total)}
          </span>
        </div>

        {/* Botón confirmar */}
        <button
          onClick={onConfirmar}
          disabled={carrito.length === 0 || submitting}
          className="w-full py-4 font-bold text-base rounded-2xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-white"
          style={{ background: carrito.length > 0 && !submitting ? 'var(--brand-teal)' : undefined, backgroundColor: carrito.length === 0 || submitting ? '#d1d5db' : undefined }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
              Procesando…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {`Confirmar venta${carrito.length > 0 ? ' · ' + fmt(total) : ''}`}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Modal Fraccionamiento ────────────────────────────────────────────────────

function FraccionarModal({
  producto,
  onClose,
  onDone,
}: {
  producto: Producto;
  onClose: () => void;
  onDone: (r: FraccionarResult) => void;
}) {
  const pesoKg          = producto.peso ?? 1;
  const precioSugerido  = Math.ceil(producto.precio_venta / pesoKg);
  const codigoAnexo     = (producto.codigo_barras ?? '').replace(/\*$/, '') + '-F';

  const [bolsas,   setBolsas]   = useState(1);
  const [precio,   setPrecio]   = useState(precioSugerido);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const kgGenerados = bolsas * pesoKg;

  const confirmar = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.post<FraccionarResult>(
        `/productos/${producto.id}/fraccionar`,
        { cantidad_bolsas: bolsas, precio_fraccionado: precio }
      );
      onDone(r);
    } catch (e: unknown) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Fraccionar bolsa" size="sm">
      <div className="space-y-5">
        {/* Info producto */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Producto origen</p>
          <p className="text-sm font-semibold text-zinc-900 leading-snug">{producto.nombre}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span>Stock: <strong className="text-zinc-800">{producto.stock} bolsas</strong></span>
            <span>·</span>
            <span>Peso: <strong className="text-zinc-800">{pesoKg} kg/bolsa</strong></span>
          </div>
        </div>

        {/* Cantidad de bolsas */}
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
            Cantidad de bolsas a fraccionar
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBolsas(b => Math.max(1, b - 1))}
              className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 font-bold text-zinc-700 text-lg transition-colors"
            >−</button>
            <input
              type="number"
              min={1}
              max={producto.stock}
              value={bolsas}
              onChange={e => setBolsas(Math.min(producto.stock, Math.max(1, Number(e.target.value))))}
              className="w-20 text-center text-base font-bold border border-zinc-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={() => setBolsas(b => Math.min(producto.stock, b + 1))}
              className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 font-bold text-zinc-700 text-lg transition-colors"
            >+</button>
            <span className="text-xs text-zinc-400">de {producto.stock} disponibles</span>
          </div>
        </div>

        {/* Preview generación */}
        <div className="bg-zinc-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Generará</p>
            <p className="text-2xl font-bold text-zinc-900">{kgGenerados} <span className="text-sm font-normal">kg</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Código anexo</p>
            <p className="text-sm font-mono font-bold text-amber-600">{codigoAnexo}</p>
          </div>
        </div>

        {/* Precio fraccionado */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-600">Precio por kg</label>
            <button
              onClick={() => setPrecio(precioSugerido)}
              className="text-[10px] text-amber-600 hover:underline"
            >
              Sugerido: {fmt(precioSugerido)}/kg
            </button>
          </div>
          <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-3 py-2 focus-within:border-amber-400 transition-colors">
            <span className="text-sm text-zinc-400 font-medium">$</span>
            <input
              type="number"
              min={0}
              value={precio}
              onChange={e => setPrecio(Number(e.target.value))}
              className="flex-1 text-base font-bold focus:outline-none bg-transparent"
            />
            <span className="text-xs text-zinc-400">/kg</span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">
            Total a generar: <strong className="text-zinc-700">{fmt(kgGenerados * precio)}</strong> en inventario
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={loading || bolsas < 1 || precio <= 0}
            className="flex-1 py-3 text-sm font-semibold rounded-xl text-white transition-colors disabled:opacity-50"
            style={{ background: 'var(--brand-teal)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                Fraccionando…
              </span>
            ) : (
              `Fraccionar ${bolsas} bolsa${bolsas > 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Historial ────────────────────────────────────────────────────────────────

function HistorialPanel() {
  const [ventas, setVentas]     = useState<Venta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [detalle, setDetalle]   = useState<Venta | null>(null);
  const [anulando, setAnulando] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.get<VentasPaginado>('/ventas')
      .then(r => { setVentas(r.data); setLoading(false); });
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

  const MEDIO_COLOR: Record<string, string> = {
    efectivo:      'bg-emerald-50 text-emerald-700',
    tarjeta:       'bg-blue-50 text-blue-700',
    oca:           'bg-orange-50 text-orange-700',
    transferencia: 'bg-violet-50 text-violet-700',
    otro:          'bg-zinc-100 text-zinc-600',
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Historial de ventas</h2>
          <p className="text-sm text-zinc-400 mt-0.5">{ventas.length} ventas registradas</p>
        </div>
        <button
          onClick={load}
          className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <div className="w-4 h-4 border-2 border-zinc-200 border-t-[var(--brand-purple)] rounded-full animate-spin" />
            Cargando...
          </div>
        ) : ventas.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="text-zinc-200 mx-auto mb-3" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v36a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V14z"/><polyline points="14 2 14 14 26 14"/>
            </svg>
            <p className="text-sm text-zinc-400">Sin ventas registradas</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    {['#', 'Fecha', 'Pago', 'Medio', 'Total', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ventas.map(v => (
                    <tr key={v.id} className={`border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors ${v.estado === 'anulada' ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">#{v.id}</td>
                      <td className="px-4 py-3 text-zinc-600 tabular-nums text-xs">
                        {new Date(v.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.tipo_pago === 'contado' ? 'bg-zinc-100 text-zinc-600' : 'bg-blue-50 text-blue-600'}`}>
                          {v.tipo_pago}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {v.medio_pago ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${MEDIO_COLOR[v.medio_pago] ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {v.medio_pago}
                          </span>
                        ) : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums" style={{ color: 'var(--brand-purple)' }}>
                        {fmt(v.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.estado === 'confirmada' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                          {v.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-3">
                        <button onClick={() => verDetalle(v.id)} className="text-zinc-400 hover:text-zinc-800 text-xs transition-colors">
                          Ver
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
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-zinc-50">
              {ventas.map(v => (
                <div key={v.id} className={`px-4 py-3 ${v.estado === 'anulada' ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-zinc-400 font-mono">#{v.id}</span>
                        <span className="text-xs text-zinc-500 tabular-nums">
                          {new Date(v.fecha).toLocaleDateString('es-CL')}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${v.estado === 'confirmada' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                          {v.estado}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {v.medio_pago && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${MEDIO_COLOR[v.medio_pago] ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {v.medio_pago}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold tabular-nums" style={{ color: 'var(--brand-purple)' }}>{fmt(v.total)}</p>
                      <div className="flex gap-2 mt-1 justify-end">
                        <button onClick={() => verDetalle(v.id)} className="text-xs text-zinc-400 hover:text-zinc-700">Ver</button>
                        {v.estado === 'confirmada' && (
                          <button
                            onClick={() => anularVenta(v.id)}
                            disabled={anulando === v.id}
                            className="text-xs text-rose-400 hover:text-rose-600 disabled:opacity-50"
                          >
                            {anulando === v.id ? '…' : 'Anular'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal detalle */}
      {detalle && (
        <Modal isOpen={!!detalle} onClose={() => setDetalle(null)} title={`Venta #${detalle.id}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {[
                ['Fecha',     new Date(detalle.fecha).toLocaleDateString('es-CL')],
                ['Total',     fmt(detalle.total)],
                ['Tipo pago', detalle.tipo_pago],
                ['Medio',     detalle.medio_pago ?? '—'],
                ['Estado',    detalle.estado],
                ['Moneda',    detalle.moneda],
              ].map(([k, v]) => (
                <div key={k} className="bg-zinc-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-zinc-800 font-semibold capitalize">{v}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    {['Producto', 'Cant.', 'Precio', 'Subtotal'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalle.detalles?.map(d => (
                    <tr key={d.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                      <td className="px-4 py-3 text-zinc-800 font-medium">{d.producto?.nombre}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-600">{d.cantidad}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-600">{fmt(d.precio_unitario)}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold" style={{ color: 'var(--brand-purple)' }}>{fmt(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detalle.kitfe_id && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-xs text-emerald-700 flex items-center gap-2">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 6 5 10 11 2"/></svg>
                Sincronizado con Kitfe · ID: {detalle.kitfe_id}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
