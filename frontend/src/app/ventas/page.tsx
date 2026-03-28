'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { api, type Categoria, type FraccionarResult, type Producto, type Venta, type VentasPaginado } from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useStockSubscriber, useRefetchOnFocus } from '@/hooks/useProductoSync';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface LineaCarrito {
  key: string;             // `${producto.id}` normal | `${producto.id}-g` granel
  producto: Producto;
  cantidad: number;        // unidades, o fracción de bolsa si esGranel
  precio_unitario: number; // por unidad, o precio*peso si esGranel
  esGranel?: boolean;
  granelKg?: number;       // kg a mostrar en carrito
  granelPrecioKg?: number; // precio/kg a mostrar en carrito
}

type Vista = 'pos' | 'historial';
type TagFiltro = 'top10' | 'fraccionadas' | 'promos' | 'combos' | 'ofertas' | 'regalos' | 'perro' | 'gato' | 'resto';

const RENDER_LIMIT = 60; // nodos DOM iniciales en el grid

type MedioPago = 'efectivo' | 'tarjeta' | 'master' | 'anda' | 'cabal' | 'transferencia' | 'otro';

const MEDIOS_PAGO: { value: MedioPago; label: string; icon: React.ReactNode }[] = [
  {
    value: 'efectivo', label: 'Efectivo',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="16" height="10" rx="2"/><circle cx="9" cy="9" r="2.5"/></svg>,
  },
  {
    value: 'tarjeta', label: 'VISA',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="16" height="10" rx="2"/><line x1="1" y1="8" x2="17" y2="8"/></svg>,
  },
  {
    value: 'master', label: 'MASTER',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6.5" cy="9" r="5.5"/><circle cx="11.5" cy="9" r="5.5"/></svg>,
  },
  {
    value: 'anda', label: 'ANDA',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="16" height="10" rx="2"/><path d="M5 9h8M9 6v6"/></svg>,
  },
  {
    value: 'cabal', label: 'CABAL',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="16" height="10" rx="2"/><line x1="1" y1="8" x2="17" y2="8"/><line x1="5" y1="8" x2="5" y2="14"/></svg>,
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
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

const MEDIO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'VISA', oca: 'OCA',
  master: 'MasterCard', anda: 'ANDA', cabal: 'CABAL',
  transferencia: 'Transferencia', otro: 'Otro', sicfe: 'SICFE',
};
const MEDIO_COLOR: Record<string, string> = {
  efectivo: 'bg-emerald-100 text-emerald-700', tarjeta: 'bg-blue-100 text-blue-700',
  oca: 'bg-orange-100 text-orange-700', master: 'bg-orange-100 text-orange-800',
  anda: 'bg-cyan-100 text-cyan-700', cabal: 'bg-indigo-100 text-indigo-700',
  transferencia: 'bg-violet-100 text-violet-700', otro: 'bg-zinc-100 text-zinc-600',
  sicfe: 'bg-zinc-100 text-zinc-500',
};

const BASE_STORAGE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api').replace('/api', '/storage');
function fotoUrl(foto: string) { return `${BASE_STORAGE}/${foto}`; }

// ─── Placeholder helpers ───────────────────────────────────────────────────────
const PLACEHOLDER_GRADIENTS: [string, string][] = [
  ['#7B2D8B','#5E1F6C'],
  ['#2563eb','#1d4ed8'],
  ['#059669','#047857'],
  ['#d97706','#b45309'],
  ['#dc2626','#b91c1c'],
  ['#0891b2','#0e7490'],
  ['#7c3aed','#6d28d9'],
];

function placeholderGradient(nombre: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return PLACEHOLDER_GRADIENTS[Math.abs(hash) % PLACEHOLDER_GRADIENTS.length];
}

function placeholderInitials(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function ProductImg({ producto, className }: { producto: Producto; className?: string }) {
  const [err, setErr] = React.useState(false);
  const src = producto.foto_url
    ?? producto.thumb_url
    ?? (producto.thumb ? fotoUrl(producto.thumb) : null)
    ?? (producto.foto  ? fotoUrl(producto.foto)  : null);

  if (!src || err) {
    const [c1, c2] = placeholderGradient(producto.nombre);
    return (
      <div
        className={`w-full h-full flex items-center justify-center select-none ${className ?? ''}`}
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      >
        <span className="text-white font-bold text-xl tracking-wide opacity-90">
          {placeholderInitials(producto.nombre)}
        </span>
      </div>
    );
  }
  return (
    <img
      src={src} alt={producto.nombre} loading="lazy"
      className={`w-full h-full object-cover ${className ?? ''}`}
      onError={() => setErr(true)}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VentasPage() {
  const [vista, setVista] = useState<Vista>('pos');
  const [creditoCanje,    setCreditoCanje]    = useState(0);
  const [canjeMedioPago,  setCanjeMedioPago]  = useState<string>('efectivo');

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

      <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col">
        {vista === 'pos'
          ? <POSPanel creditoCanje={creditoCanje} canjeMedioPago={canjeMedioPago} onClearCanje={() => { setCreditoCanje(0); setCanjeMedioPago('efectivo'); }} />
          : <HistorialPanel onIniciarCanje={(amt, medio) => { setCreditoCanje(amt); setCanjeMedioPago(medio ?? 'efectivo'); setVista('pos'); }} />
        }
      </div>
    </div>
  );
}

// ─── Paleta de colores por categoría ──────────────────────────────────────────
type CatIcon = 'zamoritos' | 'paw' | 'conejo' | 'pez' | 'ave' | 'caballo' | null;
interface CatStyle { idle: string; activeBg: string; icon: CatIcon }

function getCatStyle(nombre: string): CatStyle {
  const n = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ── Animales domésticos — colores radiantes ──────────────────────────────
  if (n.includes('perro') || n.includes('canino'))
    return { idle: 'bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-500', activeBg: '#7C3AED', icon: 'zamoritos' };
  if (n.includes('gato') || n.includes('felino'))
    return { idle: 'bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-500', activeBg: '#EA580C', icon: 'zamoritos' };
  if (n.includes('conejo'))
    return { idle: 'bg-pink-50 text-pink-600 border-pink-200 hover:border-pink-500', activeBg: '#DB2777', icon: 'conejo' };
  if (n.includes('pez') || n.includes('acuario') || n.includes('pecera'))
    return { idle: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:border-cyan-500', activeBg: '#0891B2', icon: 'pez' };

  // ── Granja / caballos — pasteles suaves ──────────────────────────────────
  if (n.includes('caballo') || n.includes('equino') || n.includes('yegua') || n.includes('potro'))
    return { idle: 'bg-lime-50 text-lime-700 border-lime-200 hover:border-lime-400', activeBg: '#65A30D', icon: 'caballo' };
  if (n.includes('bovino') || n.includes('vaca') || n.includes('ternero'))
    return { idle: 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-400', activeBg: '#78716C', icon: null };
  if (n.includes('cerdo') || n.includes('porcino'))
    return { idle: 'bg-rose-50 text-rose-500 border-rose-200 hover:border-rose-300', activeBg: '#F43F5E', icon: null };
  if (n.includes('aves') || n.includes('ave') || n.includes('gallina') || n.includes('pollo') || n.includes('pajaro') || n.includes('loro'))
    return { idle: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:border-yellow-400', activeBg: '#CA8A04', icon: 'ave' };

  // ── Categorías de producto ────────────────────────────────────────────────
  if (n.includes('alimento') || n.includes('comida'))
    return { idle: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400', activeBg: '#059669', icon: null };
  if (n.includes('snack') || n.includes('premio'))
    return { idle: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400', activeBg: '#D97706', icon: null };
  if (n.includes('higiene'))
    return { idle: 'bg-sky-50 text-sky-600 border-sky-200 hover:border-sky-400', activeBg: '#0284C7', icon: null };
  if (n.includes('estetica') || n.includes('grooming'))
    return { idle: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200 hover:border-fuchsia-400', activeBg: '#A21CAF', icon: null };
  if (n.includes('limpieza'))
    return { idle: 'bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-400', activeBg: '#2563EB', icon: null };
  if (n.includes('veneno') || n.includes('raticida') || n.includes('insect'))
    return { idle: 'bg-red-50 text-red-600 border-red-200 hover:border-red-400', activeBg: '#DC2626', icon: null };
  if (n.includes('paseo') || n.includes('collar') || n.includes('correa'))
    return { idle: 'bg-green-50 text-green-600 border-green-200 hover:border-green-400', activeBg: '#16A34A', icon: null };
  if (n.includes('ropa') || n.includes('vestimenta'))
    return { idle: 'bg-purple-50 text-purple-600 border-purple-200 hover:border-purple-400', activeBg: '#9333EA', icon: null };
  if (n.includes('comedero') || n.includes('bebedero'))
    return { idle: 'bg-teal-50 text-teal-600 border-teal-200 hover:border-teal-400', activeBg: '#0D9488', icon: null };

  // ── Default ───────────────────────────────────────────────────────────────
  return { idle: 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400', activeBg: 'var(--brand-purple)', icon: null };
}

// ─── Panel POS ────────────────────────────────────────────────────────────────

function POSPanel({ creditoCanje, canjeMedioPago, onClearCanje }: { creditoCanje: number; canjeMedioPago: string; onClearCanje: () => void }) {
  const [productos, setProductos]     = useState<Producto[]>([]);
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [catActiva, setCatActiva]     = useState<number | null>(null);
  const [busqueda, setBusqueda]       = useState('');
  const [carrito, setCarrito]         = useState<LineaCarrito[]>([]);
  const [tipoPago, setTipoPago]       = useState<'contado' | 'credito'>('contado');
  const [medioPago, setMedioPago]     = useState<MedioPago>('efectivo');
  const [modoPago, setModoPago]       = useState<'unico' | 'combinado'>('unico');
  const [pagos, setPagos]             = useState<PagoLinea[]>([]);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [ventaModal, setVentaModal]   = useState<{ total: number; stockAlerts: { nombre: string; stock: number }[] } | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [cartOpen, setCartOpen]         = useState(false);
  const [addedId, setAddedId]           = useState<number | null>(null);
  const [fraccionando, setFraccionando] = useState<Producto | null>(null);
  const [kgPicker, setKgPicker] = useState<{ producto: Producto; kg: string; precio: string; modo: 'kg' | 'g' } | null>(null);
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [nroFactura, setNroFactura] = useState('');
  const [lastFacturaNum, setLastFacturaNum] = useState(0);
  const [facturaPadLen, setFacturaPadLen] = useState(6);
  const [pendingBody, setPendingBody] = useState<Record<string, unknown> | null>(null);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoBusqueda, setPromoBusqueda] = useState('');
  const [promoTab, setPromoTab]           = useState<'existentes' | 'crear'>('existentes');
  const [crearSearch,      setCrearSearch]      = useState('');
  const [crearComponentes, setCrearComponentes] = useState<{producto_id: number; nombre: string; cantidad: number}[]>([]);
  const [crearEnPromo,     setCrearEnPromo]     = useState<1|2|3>(1);
  const [crearPrecio, setCrearPrecio]     = useState('');
  const [creandoCombo, setCreandoCombo]   = useState(false);
  const [fraccionarGranel, setFraccionarGranel] = useState<Producto | null>(null);
  const [guardarNombre, setGuardarNombre]       = useState('');
  const [guardarModalOpen, setGuardarModalOpen] = useState(false);
  const [cargarModalOpen,  setCargarModalOpen]  = useState(false);
  const [carritoGuardados, setCarritoGuardados] = useState<Array<{id: string; nombre: string; fecha: string; items: LineaCarrito[]}>>([]);
  const [tagActivo,  setTagActivo]  = useState<TagFiltro | null>(null);
  const [renderLimit, setRenderLimit] = useState(RENDER_LIMIT);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const promoBusquedaRef = useRef<HTMLInputElement>(null);

  const recargarProductos = useCallback(() => {
    api.get<Producto[]>('/productos').then(setProductos);
  }, []);

  // Cargar último número de factura para auto-sugerir el próximo
  useEffect(() => {
    api.get<VentasPaginado>('/ventas').then(r => {
      const entries = r.data
        .map(v => v.numero_factura ?? '')
        .filter(Boolean)
        .map(s => ({ s, n: parseInt(s.replace(/\D/g, ''), 10) }))
        .filter(({ n }) => !isNaN(n) && n > 0);
      if (entries.length > 0) {
        const best = entries.reduce((a, b) => b.n > a.n ? b : a);
        setLastFacturaNum(best.n);
        setFacturaPadLen(Math.max(best.s.length, 4));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    recargarProductos();
    api.get<Categoria[]>('/categorias').then(setCategorias);
    searchRef.current?.focus();
  }, [recargarProductos]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('zamoritos_carritos');
      if (raw) setCarritoGuardados(JSON.parse(raw));
    } catch {}
  }, []);

  // ── Sync real-time de stock desde otras tabs (BroadcastChannel) ──────────────
  useStockSubscriber(useCallback(({ productoId, newStock }) => {
    setProductos(prev => prev.map(p => p.id === productoId ? { ...p, stock: newStock } : p));
  }, []));

  // ── Refetch silencioso cuando la tab recupera el foco ────────────────────────
  useRefetchOnFocus(recargarProductos);

  // ── Infinite scroll: ampliar render limit al llegar al centinela ─────────────
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setRenderLimit(l => l + RENDER_LIMIT); },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Resetear render limit cada vez que cambia el filtro/búsqueda
  useEffect(() => { setRenderLimit(RENDER_LIMIT); }, [catActiva, tagActivo, busqueda]);

  // Pre-seleccionar medio de pago del canje (preserva el método original de la venta devuelta)
  useEffect(() => {
    if (creditoCanje > 0 && canjeMedioPago) {
      setMedioPago(canjeMedioPago as MedioPago);
    }
  }, [creditoCanje, canjeMedioPago]);

  // Mapa id → Categoria para filtros por tag
  const catById = useMemo(() => {
    const m = new Map<number, typeof categorias[0]>();
    categorias.forEach(c => m.set(c.id, c));
    return m;
  }, [categorias]);

  // IDs de los top-10 más vendidos con stock (para badge ⭐ en tarjeta)
  const top10Ids = useMemo(() =>
    new Set(productos.filter(p => p.activo && p.stock > 0).slice(0, 10).map(p => p.id)),
  [productos]);

  // Productos filtrados — orden: destacado → más vendidos → stock desc → sin stock al fondo
  const productosFiltrados = useMemo(() => {
    let lista = productos.filter(p => p.activo);

    const tags = (p: Producto): string[] => p.categoria_id ? (catById.get(p.categoria_id)?.tags ?? []) : [];
    const esPerro = (p: Producto) => tags(p).includes('perro');
    const esGato  = (p: Producto) => tags(p).includes('gato');
    const esResto = (p: Producto) => tags(p).some(t => ['ave', 'granja', 'conejo', 'pez'].includes(t));

    if (tagActivo === 'top10') {
      lista = lista.filter(p => p.stock > 0).slice(0, 10);
    } else if (tagActivo === 'fraccionadas') {
      lista = lista.filter(p => !!p.fraccionado_de);
    } else if (tagActivo === 'promos') {
      lista = lista.filter(p => (p.en_promo ?? 0) > 0);
    } else if (tagActivo === 'combos') {
      lista = lista.filter(p => p.en_promo === 1);
    } else if (tagActivo === 'ofertas') {
      lista = lista.filter(p => p.en_promo === 2);
    } else if (tagActivo === 'regalos') {
      lista = lista.filter(p => p.en_promo === 3);
    } else if (tagActivo === 'perro') {
      lista = lista.filter(esPerro);
    } else if (tagActivo === 'gato') {
      lista = lista.filter(esGato);
    } else if (tagActivo === 'resto') {
      lista = lista.filter(esResto);
    } else if (catActiva) {
      lista = lista.filter(p => p.categoria_id === catActiva);
    } else {
      // Vista por defecto: todos los productos con stock > 0
      lista = lista.filter(p => p.stock > 0);
    }

    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_barras ?? '').toLowerCase().includes(q) ||
        (p.marca ?? '').toLowerCase().includes(q) ||
        String(p.precio_venta).includes(q)
      );
    }
    if (!q && tagActivo !== 'top10') {
      lista = [
        ...lista.filter(p => p.stock > 0),
        ...lista.filter(p => p.stock <= 0),
      ];
    }
    return lista;
  }, [productos, catActiva, tagActivo, busqueda, catById]);

  // Categorías que tienen al menos un producto activo
  const categoriasConProductos = useMemo(() => {
    const ids = new Set(productos.filter(p => p.activo && p.categoria_id).map(p => p.categoria_id!));
    return categorias.filter(c => ids.has(c.id));
  }, [productos, categorias]);

  // Lista modal combos existentes
  const promosFiltrados = useMemo(() => {
    let lista = productos.filter(p => p.activo && p.en_promo === 1);
    const q = promoBusqueda.trim().toLowerCase();
    if (q) lista = lista.filter(p => p.nombre.toLowerCase().includes(q));
    return lista;
  }, [productos, promoBusqueda]);

  const agregarAlCarrito = useCallback((p: Producto, cantidad = 1, customPrice?: number) => {
    const key = String(p.id);
    setCarrito(prev => {
      const existente = prev.find(l => l.key === key);
      if (existente) {
        return prev.map(l => l.key === key ? { ...l, cantidad: l.cantidad + cantidad } : l);
      }
      return [...prev, { key, producto: p, cantidad, precio_unitario: customPrice ?? p.precio_venta }];
    });
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 600);
    setBusqueda('');
    searchRef.current?.focus();
  }, []);

  const agregarGranelAlCarrito = useCallback((p: Producto, kg: number, precioKg: number) => {
    const peso = p.peso ?? 1;
    const key  = `${p.id}-g`;
    setCarrito(prev => {
      const existente = prev.find(l => l.key === key);
      if (existente) {
        const newKg = (existente.granelKg ?? 0) + kg;
        return prev.map(l => l.key === key ? {
          ...l,
          cantidad: newKg / peso,
          granelKg: newKg,
          granelPrecioKg: precioKg,
          precio_unitario: precioKg * peso,
        } : l);
      }
      return [...prev, {
        key,
        producto: p,
        cantidad: kg / peso,
        precio_unitario: precioKg * peso,
        esGranel: true,
        granelKg: kg,
        granelPrecioKg: precioKg,
      }];
    });
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 600);
  }, []);

  const agregarDesdePromoModal = useCallback((p: Producto) => {
    const key = String(p.id);
    setCarrito(prev => {
      const existe = prev.find(l => l.key === key);
      return existe
        ? prev.map(l => l.key === key ? { ...l, cantidad: l.cantidad + 1 } : l)
        : [...prev, { key, producto: p, cantidad: 1, precio_unitario: p.precio_venta }];
    });
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 600);
    setPromoModalOpen(false);
    setPromoBusqueda('');
  }, []);

  const crearComboYAgregar = async () => {
    if (crearComponentes.length === 0 || !crearPrecio) return;
    const firstP = productos.find(p => p.id === crearComponentes[0].producto_id);
    const nombre = crearEnPromo === 1
      ? `${firstP?.nombre ?? crearComponentes[0].nombre} × ${crearComponentes.reduce((s, ci) => s + ci.cantidad, 0)}`
      : crearComponentes.map(ci => {
          const p = productos.find(pp => pp.id === ci.producto_id);
          return ci.cantidad !== 1 ? `${p?.nombre ?? ci.nombre} ×${ci.cantidad}` : (p?.nombre ?? ci.nombre);
        }).join(' + ');
    const codigo = ((firstP?.codigo_barras ?? String(firstP?.id ?? '')) + 'C');
    const items = crearComponentes.map(ci => ({ componente_producto_id: ci.producto_id, cantidad: ci.cantidad }));
    setCreandoCombo(true);
    setError('');
    try {
      const nuevo = await api.post<Producto>('/productos', {
        nombre, codigo_barras: codigo,
        precio_venta: Number(crearPrecio),
        unidad_medida: 'unidad',
        es_combo: true,
        en_promo: crearEnPromo,
        combo_items: items,
      });
      recargarProductos();
      agregarAlCarrito({ ...nuevo, stock: 999 });
      setPromoModalOpen(false);
      setCrearSearch(''); setCrearComponentes([]); setCrearPrecio(''); setCrearEnPromo(1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreandoCombo(false);
    }
  };

  const cambiarCantidad = (key: string, delta: number) => {
    setCarrito(prev =>
      prev.map(l => {
        if (l.key !== key) return l;
        if (l.esGranel && l.granelKg != null) {
          const peso   = l.producto.peso ?? 1;
          const newKg  = Math.max(0.1, l.granelKg + delta * 0.5);
          return { ...l, granelKg: newKg, cantidad: newKg / peso };
        }
        return { ...l, cantidad: l.cantidad + delta };
      }).filter(l => l.cantidad > 0)
    );
  };

  const quitarItem = (key: string) => setCarrito(prev => prev.filter(l => l.key !== key));

  const cambiarPrecio = (key: string, precio: string) => {
    const val = parseFloat(precio);
    if (isNaN(val)) return;
    setCarrito(prev => prev.map(l => {
      if (l.key !== key) return l;
      if (l.esGranel) {
        const peso = l.producto.peso ?? 1;
        return { ...l, granelPrecioKg: val, precio_unitario: val * peso };
      }
      return { ...l, precio_unitario: val };
    }));
  };

  const vaciarCarrito = () => { setCarrito([]); setError(''); };

  const guardarCarrito = (nombre: string) => {
    const nuevo = { id: Date.now().toString(), nombre, fecha: new Date().toLocaleString('es-UY'), items: carrito };
    const nuevos = [nuevo, ...carritoGuardados].slice(0, 10);
    setCarritoGuardados(nuevos);
    try { localStorage.setItem('zamoritos_carritos', JSON.stringify(nuevos)); } catch {}
    setGuardarModalOpen(false);
  };

  const eliminarCarritoGuardado = (id: string) => {
    const nuevos = carritoGuardados.filter(c => c.id !== id);
    setCarritoGuardados(nuevos);
    try { localStorage.setItem('zamoritos_carritos', JSON.stringify(nuevos)); } catch {}
  };

  const total      = carrito.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);
  const totalItems = carrito.reduce((s, l) => s + (l.esGranel ? 1 : l.cantidad), 0);

  const confirmarVenta = () => {
    if (carrito.length === 0) return;
    if (total <= 0) { setError('El total de la venta debe ser mayor a $0.'); return; }
    const totalAPagar = Math.max(0, total - creditoCanje);

    // Validar pago combinado
    if (modoPago === 'combinado') {
      const sumPagos = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
      if (Math.abs(sumPagos - totalAPagar) > 0.01) {
        setError(`Los pagos suman ${fmt(sumPagos)} pero el total a pagar es ${fmt(totalAPagar)}.`);
        return;
      }
      if (pagos.length === 0) {
        setError('Agregá al menos un medio de pago.');
        return;
      }
    }

    // Armar body pendiente y abrir modal de factura
    const body: Record<string, unknown> = {
      fecha:     new Date().toISOString().slice(0, 10),
      tipo_pago: tipoPago,
      detalles:  carrito.map(l => ({
        producto_id:     l.producto.id,
        cantidad:        l.cantidad,
        precio_unitario: l.precio_unitario,
      })),
    };
    if (modoPago === 'combinado' && pagos.length > 0) {
      body.medios_pago = pagos.map(p => ({ medio: p.medio, monto: parseFloat(p.monto) || 0 }));
    } else {
      body.medio_pago = medioPago;
    }
    if (creditoCanje > 0) body.credito_devolucion = creditoCanje;
    setPendingBody(body);
    setNroFactura(String(lastFacturaNum + 1).padStart(facturaPadLen, '0'));
    setShowFacturaModal(true);
  };

  const ejecutarVenta = async (nroFact: string) => {
    if (!pendingBody) return;
    setShowFacturaModal(false);
    setSubmitting(true);
    setError('');
    const body = { ...pendingBody };
    if (nroFact && nroFact !== '0') body.numero_factura = nroFact;
    try {
      await api.post<Venta>('/ventas', body);
      if (nroFact && nroFact !== '0') {
        const n = parseInt(nroFact.replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > lastFacturaNum) {
          setLastFacturaNum(n);
          setFacturaPadLen(Math.max(nroFact.length, facturaPadLen));
        }
      }
      const alerts = carrito
        .filter(l => (l.producto.stock - l.cantidad) <= 3 && (l.producto.stock - l.cantidad) >= 0)
        .map(l => ({ nombre: l.producto.nombre, stock: l.producto.stock - l.cantidad }));
      setVentaModal({ total, stockAlerts: alerts });
      setTimeout(() => setVentaModal(null), alerts.length > 0 ? 2500 : 1000);
      setCarrito([]);
      setCartOpen(false);
      setModoPago('unico');
      setPagos([]);
      setPendingBody(null);
      onClearCanje();
      recargarProductos();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Toasts flotantes ── */}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
      {error   && <Toast message={error}   type="error"   onClose={() => setError('')}   duration={5000} />}

      {/* ── Left: productos ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Búsqueda + filtros */}
        <div className="px-4 pt-4 pb-3 bg-white border-b border-zinc-100 space-y-3 shrink-0">

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
                onChange={e => { setBusqueda(e.target.value); setCatActiva(null); setTagActivo(null); }}
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
            <button
              onClick={() => { setPromoModalOpen(true); setPromoBusqueda(''); setPromoTab('existentes'); setTimeout(() => promoBusquedaRef.current?.focus(), 80); }}
              className="h-10 px-3 flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 hover:bg-rose-100 hover:border-rose-400 transition-colors shrink-0 text-xs font-semibold whitespace-nowrap"
              title="Agregar combo o producto en oferta"
            >
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12.79 2.76 3.29 13h7.42l-.71 8.24 9.5-10.24H12l.79-8.24z"/></svg>
              Agregar promo
            </button>
          </div>

          {/* Categorías + tags especiales */}
          {!busqueda && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {/* Todos */}
              <button
                onClick={() => { setCatActiva(null); setTagActivo(null); }}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  catActiva === null && !tagActivo
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                }`}
                style={catActiva === null && !tagActivo ? { background: 'var(--brand-purple)' } : {}}
              >
                Todos
              </button>

              {/* ── Tags animales principales ── */}
              {([
                { tag: 'perro' as TagFiltro, label: '🐶 Perro',  cls: 'bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-500', active: '#7C3AED' },
                { tag: 'gato'  as TagFiltro, label: '🐱 Gato',   cls: 'bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-500', active: '#EA580C' },
                { tag: 'resto' as TagFiltro, label: '🐾 Resto',  cls: 'bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-400',         active: '#0D9488' },
              ] as const).map(({ tag, label, cls, active }) => (
                <button
                  key={tag}
                  onClick={() => { setTagActivo(prev => prev === tag ? null : tag); setCatActiva(null); }}
                  className={`shrink-0 px-4 py-1.5 text-sm font-bold rounded-xl border transition-all whitespace-nowrap ${
                    tagActivo === tag ? 'text-white border-transparent shadow-sm' : cls
                  }`}
                  style={tagActivo === tag ? { background: active } : {}}
                >
                  {label}
                </button>
              ))}

              {/* ── Tags especiales ── */}
              {([
                { tag: 'top10'        as TagFiltro, label: '⭐ Top 10', cls: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400', active: '#b45309' },
                { tag: 'fraccionadas' as TagFiltro, label: '✂ Fracc.',  cls: 'bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-400',         active: '#0284c7' },
                { tag: 'promos'       as TagFiltro, label: '🔥 Promos', cls: 'bg-rose-50 text-rose-600 border-rose-200 hover:border-rose-400',     active: '#e11d48' },
                { tag: 'regalos'      as TagFiltro, label: '🎁 Ajustes', cls: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:border-fuchsia-400', active: '#a21caf' },
              ] as const).map(({ tag, label, cls, active }) => (
                <button
                  key={tag}
                  onClick={() => { setTagActivo(prev => prev === tag ? null : tag); setCatActiva(null); }}
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap ${
                    tagActivo === tag ? 'text-white border-transparent shadow-sm' : cls
                  }`}
                  style={tagActivo === tag ? { background: active } : {}}
                >
                  {label}
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
                {tagActivo === 'top10' ? ' · Top 10' : tagActivo === 'fraccionadas' ? ' · Fraccionadas' : tagActivo === 'promos' ? ' · Promos' : tagActivo === 'combos' ? ' · Combos' : tagActivo === 'ofertas' ? ' · Ofertas' : tagActivo === 'regalos' ? ' · Regalos' : tagActivo === 'perro' ? ' · Perro' : tagActivo === 'gato' ? ' · Gato' : tagActivo === 'resto' ? ' · Resto animales' : catActiva ? ` · ${categorias.find(c => c.id === catActiva)?.nombre}` : ' · Destacados'}
                {busqueda && ` · "${busqueda}"`}
                {renderLimit < productosFiltrados.length && (
                  <span className="text-zinc-300"> · mostrando {renderLimit}</span>
                )}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                {productosFiltrados.slice(0, renderLimit).map(p => {
                  const agotado        = p.stock <= 0 && p.en_promo !== 3;
                  const stockBajo      = !agotado && p.stock <= 5;
                  const added          = addedId === p.id;
                  const esFraccionado  = !!p.fraccionado_de;
                  const esCombo        = p.en_promo === 1;
                  const esTop10        = top10Ids.has(p.id);
                  // unidad + fraccionable + peso → Fraccionar bolsas en kg
                  const puedeFraccionar = !agotado && p.unidad_medida !== 'kg' && (p.peso ?? 0) > 0 && !esFraccionado && !!p.fraccionable;
                  // kg + fraccionable (o es producto fraccionado) → picker de peso al vender
                  const esVentaKg      = (!!p.fraccionable || !!p.fraccionado_de) && p.unidad_medida === 'kg';
                  return (
                    <div
                      key={p.id}
                      className={`relative flex flex-col rounded-2xl border transition-all duration-150 ${
                        agotado
                          ? 'opacity-40 bg-white border-zinc-100'
                          : esCombo
                          ? 'bg-violet-50/40 border-violet-200 hover:border-violet-400 hover:shadow-md'
                          : esFraccionado
                          ? 'bg-amber-50/50 border-amber-200'
                          : added
                          ? 'border-[var(--brand-teal)] bg-[var(--brand-teal)]/5'
                          : 'bg-white border-zinc-100 hover:border-[var(--brand-purple)]/40 hover:shadow-md'
                      }`}
                    >
                      {/* ✓ añadido y punto stock bajo — siempre absolute */}
                      {added && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10"
                          style={{ background: 'var(--brand-teal)' }}>✓</span>
                      )}
                      {stockBajo && !added && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 z-10" />
                      )}

                      {/* Cuerpo: toca para agregar al carrito */}
                      <button
                        onClick={() => !agotado && (esVentaKg ? setKgPicker({ producto: p, kg: '', precio: String(p.precio_venta), modo: 'kg' }) : agregarAlCarrito(p))}
                        disabled={agotado}
                        className="flex-1 text-left p-3.5 pb-2 active:scale-95 transition-transform disabled:cursor-not-allowed"
                      >
                        {/* Imagen — siempre presente, con placeholder si no tiene foto */}
                        <div className="relative w-full h-24 rounded-xl overflow-hidden mb-2">
                          <ProductImg producto={p} />
                          {esCombo && (
                            <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500 text-white shadow-sm">COMBO</span>
                          )}
                          {esFraccionado && !esCombo && (
                            <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-white shadow-sm">FRAC.</span>
                          )}
                          {esVentaKg && !esFraccionado && !esCombo && (
                            <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500 text-white shadow-sm">⚖ KG</span>
                          )}
                          {p.destacado && !esCombo && !esFraccionado && !esTop10 && (
                            <span className="absolute top-1 left-1 text-sm leading-none">⭐</span>
                          )}
                          {esTop10 && (
                            <span className="absolute top-1 right-1 text-base leading-none drop-shadow">⭐</span>
                          )}
                          {agotado && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-rose-500 bg-white/90 px-2 py-0.5 rounded-full border border-rose-200">SIN STOCK</span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-zinc-800 leading-snug line-clamp-2 mb-2 min-h-[2.5rem]">
                          {p.nombre}
                        </p>
                        {p.marca && (
                          <p className="text-[10px] text-zinc-400 mb-1.5 truncate">{p.marca}</p>
                        )}
                        <p className={`font-bold tabular-nums ${esFraccionado || esVentaKg ? 'text-lg' : 'text-base'}`} style={{ color: 'var(--brand-purple)' }}>
                          {fmt(p.precio_venta)}
                          {(esFraccionado || esVentaKg) && (
                            <span className="text-xs font-semibold text-amber-600 ml-1">/kg</span>
                          )}
                        </p>
                        <p className={`text-xs mt-1 font-bold ${
                          agotado ? 'text-rose-500' : stockBajo ? 'text-amber-500' : 'text-zinc-500'
                        }`}>
                          {agotado ? 'Sin stock' : `${p.stock} ${p.unidad_medida}`}
                          {esFraccionado && !agotado && <span className="text-zinc-300"> · frac.</span>}
                        </p>
                      </button>

                      {/* Botón fraccionar */}
                      {puedeFraccionar && (
                        <div className="flex border-t border-zinc-100 rounded-b-2xl overflow-hidden">
                          <button
                            onClick={() => setFraccionando(p)}
                            title={`Fraccionar bolsa (${p.peso} kg/bolsa)`}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M7 1L1 7M1 1l6 6"/><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                            </svg>
                            Fraccionar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div ref={sentinelRef} className="h-4" />
            </>
          )}
        </div>
      </div>

      {/* ── Right: Carrito desktop ── */}
      <div className="hidden lg:block relative w-80 xl:w-96 shrink-0 bg-white border-l border-zinc-100">
        <div className="absolute inset-0 flex flex-col overflow-hidden">
        <CarritoPanel
          carrito={carrito}
          total={total}
          tipoPago={tipoPago}
          medioPago={medioPago}
          modoPago={modoPago}
          pagos={pagos}
          submitting={submitting}
          creditoCanje={creditoCanje}
          onClearCanje={onClearCanje}
          onCambiarCantidad={cambiarCantidad}
          onCambiarPrecio={cambiarPrecio}
          onQuitarItem={quitarItem}
          onVaciar={vaciarCarrito}
          onTipoPago={setTipoPago}
          onMedioPago={(v) => setMedioPago(v as MedioPago)}
          onModoPago={setModoPago}
          onSetPagos={setPagos}
          onConfirmar={confirmarVenta}
          onGuardar={() => { setGuardarNombre(`Carrito · ${new Date().toLocaleTimeString('es-UY', {hour:'2-digit',minute:'2-digit'})}`); setGuardarModalOpen(true); }}
          onCargar={() => setCargarModalOpen(true)}
          hayGuardados={carritoGuardados.length > 0}
        />
        </div>
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
              <span className="truncate">Confirmar · {fmt(total)}</span>
            </>
          )}
        </button>
      </div>

      {/* ── Modal venta por kg / g ── */}
      {kgPicker && (() => {
        const p     = kgPicker.producto;
        const modo  = kgPicker.modo;
        const isG   = modo === 'g';
        // In g-mode: input is grams (integer), precio is per 100g
        // In kg-mode: input is kg (decimal), precio is per kg
        const rawVal = parseFloat(kgPicker.kg.replace(',', '.')) || 0;
        const prec   = parseFloat(kgPicker.precio.replace(',', '.')) || p.precio_venta;
        // Normalise to kg for validation and cart
        const cantKg   = isG ? rawVal / 1000 : rawVal;
        const precKg   = prec;                             // always /kg
        const sub      = cantKg * precKg;
        const stockOk  = cantKg > 0 && cantKg <= p.stock;

        const switchModo = (next: 'kg' | 'g') => {
          if (next === modo) return;
          setKgPicker(prev => {
            if (!prev) return prev;
            const cur = parseFloat(prev.kg.replace(',', '.')) || 0;
            if (next === 'g') {
              // kg → g: multiply amount by 1000, price stays /kg
              return { ...prev, modo: 'g', kg: String(Math.round(cur * 1000)) };
            } else {
              // g → kg: divide amount by 1000, price stays /kg
              return { ...prev, modo: 'kg', kg: cur > 0 ? (cur / 1000).toFixed(3) : '' };
            }
          });
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setKgPicker(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 space-y-4" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div>
                <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wide">Venta por peso</p>
                <p className="text-sm font-semibold text-zinc-800 leading-snug mt-0.5">{p.nombre}</p>
                <p className="text-xs text-zinc-400 mt-0.5">Stock: {p.stock} kg · Ref: ${Math.round(p.precio_venta).toLocaleString('es-CL')}/kg</p>
              </div>

              {/* kg / g toggle */}
              <div className="flex rounded-xl border border-zinc-200 overflow-hidden text-sm font-semibold">
                <button
                  onClick={() => switchModo('kg')}
                  className={`flex-1 py-2 transition-colors ${!isG ? 'text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
                  style={!isG ? { background: 'var(--brand-teal)' } : {}}>
                  kg
                </button>
                <button
                  onClick={() => switchModo('g')}
                  className={`flex-1 py-2 transition-colors ${isG ? 'text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
                  style={isG ? { background: 'var(--brand-teal)' } : {}}>
                  g
                </button>
              </div>

              {/* Cantidad */}
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">
                  Cantidad {isG ? '(gramos)' : '(kg)'}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setKgPicker(prev => {
                      if (!prev) return prev;
                      const cur = parseFloat(prev.kg.replace(',','.')) || 0;
                      const step = isG ? 100 : 0.5;
                      const next = Math.max(0, cur - step);
                      return { ...prev, kg: isG ? String(Math.round(next)) : next.toFixed(3) };
                    })}
                    className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center text-lg font-bold text-zinc-500 hover:bg-zinc-100">−</button>
                  <input
                    autoFocus
                    type="number"
                    step={isG ? 100 : 0.001}
                    min={isG ? 1 : 0.001}
                    value={kgPicker.kg}
                    onChange={e => setKgPicker(prev => prev && { ...prev, kg: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && stockOk && (agregarAlCarrito(p, cantKg, precKg), setKgPicker(null))}
                    className="flex-1 min-w-0 border border-zinc-200 rounded-xl px-3 py-2 text-center text-lg font-bold tabular-nums focus:outline-none focus:border-zinc-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    placeholder={isG ? '0' : '0.000'}
                  />
                  <button
                    onClick={() => setKgPicker(prev => {
                      if (!prev) return prev;
                      const cur = parseFloat(prev.kg.replace(',','.')) || 0;
                      const step = isG ? 100 : 0.5;
                      const next = cur + step;
                      return { ...prev, kg: isG ? String(Math.round(next)) : next.toFixed(3) };
                    })}
                    className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center text-lg font-bold text-zinc-500 hover:bg-zinc-100">+</button>
                </div>
              </div>

              {/* Precio */}
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">
                  Precio /kg
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">$</span>
                  <input
                    type="number"
                    min={0}
                    value={kgPicker.precio}
                    onChange={e => setKgPicker(prev => prev && { ...prev, precio: e.target.value })}
                    className="flex-1 min-w-0 border border-zinc-200 rounded-xl px-3 py-2 text-center text-base font-bold tabular-nums focus:outline-none focus:border-zinc-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-zinc-400">/kg</span>
                </div>
              </div>

              {/* Subtotal */}
              <div>
                {cantKg > 0 && (
                  <p className="text-xs text-zinc-500 mt-1.5 text-center">
                    Subtotal: <strong className="text-zinc-800">${Math.round(sub).toLocaleString('es-CL')}</strong>
                    {cantKg > p.stock && <span className="text-rose-500 ml-2">⚠ supera el stock</span>}
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button onClick={() => setKgPicker(null)}
                  className="flex-1 py-2.5 text-sm rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50">Cancelar</button>
                <button
                  disabled={!stockOk}
                  onClick={() => { agregarAlCarrito(p, cantKg, precKg); setKgPicker(null); }}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-40"
                  style={{ background: 'var(--brand-teal)' }}>
                  Agregar {cantKg > 0 ? (isG ? `${rawVal}g` : `${cantKg.toFixed(3)} kg`) : ''}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal fraccionamiento ── */}
      {fraccionando && (
        <FraccionarModal
          producto={fraccionando}
          onClose={() => setFraccionando(null)}
          onDone={(resultado) => {
            setFraccionando(null);
            // Actualiza al instante: original con stock reducido, fraccionado nuevo o actualizado
            setProductos(prev => {
              const sinOriginal = prev.map(p =>
                p.id === resultado.original.id    ? resultado.original    :
                p.id === resultado.fraccionado.id ? resultado.fraccionado : p
              );
              // Si el fraccionado es nuevo (no estaba en la lista), agregarlo
              const yaExiste = sinOriginal.some(p => p.id === resultado.fraccionado.id);
              return yaExiste ? sinOriginal : [...sinOriginal, resultado.fraccionado];
            });
            recargarProductos(); // recarga en background para consistencia total
            const unidadLabel = resultado.modo_fraccion === 'unidad' ? 'unidades' : 'kg';
            setSuccess(`✓ ${resultado.unidades_generadas} ${unidadLabel} · ${resultado.codigo_fraccionado}`);
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
          modoPago={modoPago}
          pagos={pagos}
          submitting={submitting}
          creditoCanje={creditoCanje}
          onClearCanje={onClearCanje}
          onCambiarCantidad={cambiarCantidad}
          onCambiarPrecio={cambiarPrecio}
          onQuitarItem={quitarItem}
          onVaciar={vaciarCarrito}
          onTipoPago={setTipoPago}
          onMedioPago={(v) => setMedioPago(v as MedioPago)}
          onModoPago={setModoPago}
          onSetPagos={setPagos}
          onConfirmar={() => { confirmarVenta(); }}
          onGuardar={() => { setGuardarNombre(`Carrito · ${new Date().toLocaleTimeString('es-UY', {hour:'2-digit',minute:'2-digit'})}`); setGuardarModalOpen(true); }}
          onCargar={() => setCargarModalOpen(true)}
          hayGuardados={carritoGuardados.length > 0}
        />
      </Modal>

      {/* ── Modal agregar promo / combo ── */}
      {promoModalOpen && (() => {
        const costoEst = crearComponentes.reduce((s, ci) => {
          const p = productos.find(pp => pp.id === ci.producto_id);
          return s + (p?.precio_compra ?? 0) * ci.cantidad;
        }, 0);
        const precioNum = Number(crearPrecio);
        const margen = costoEst > 0 && precioNum > 0
          ? Math.round(((precioNum - costoEst) / costoEst) * 100)
          : null;
        const matchSearch = crearSearch.trim().toLowerCase();
        const sugeridos = matchSearch.length >= 2
          ? productos.filter(p =>
              !p.en_promo &&
              (p.nombre.toLowerCase().includes(matchSearch) || (p.codigo_barras ?? '').includes(matchSearch)) &&
              p.stock > 0
            ).slice(0, 6)
          : [];
        const promoTypeColors: Record<number, string> = { 1: 'bg-violet-500', 2: 'bg-amber-500', 3: 'bg-rose-500' };
        const promoTypeLabels: Record<number, string> = { 1: 'COMBO', 2: 'OFERTA', 3: 'REGALO' };
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPromoModalOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: '82vh' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                <h2 className="font-bold text-zinc-900 flex items-center gap-2">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  Combos
                </h2>
                <button onClick={() => setPromoModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="15" y2="15"/><line x1="15" y1="1" x2="1" y2="15"/></svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-4 py-2.5 border-b border-zinc-100">
                {(['existentes', 'crear'] as const).map(t => (
                  <button key={t} onClick={() => setPromoTab(t)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      promoTab === t ? 'text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                    }`}
                    style={promoTab === t ? { background: 'var(--brand-purple)' } : {}}
                  >
                    {t === 'existentes' ? 'Existentes' : '+ Crear combo'}
                  </button>
                ))}
              </div>

              {promoTab === 'existentes' ? (
                <>
                  {/* Search */}
                  <div className="px-4 py-3 border-b border-zinc-100">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                        width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="5.5" cy="5.5" r="4.5"/><line x1="9" y1="9" x2="13" y2="13"/>
                      </svg>
                      <input ref={promoBusquedaRef} value={promoBusqueda}
                        onChange={e => setPromoBusqueda(e.target.value)}
                        placeholder="Buscar combo…"
                        className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-xl bg-zinc-50 focus:outline-none focus:border-[var(--brand-purple)] focus:bg-white transition-colors"
                      />
                      {promoBusqueda && (
                        <button onClick={() => setPromoBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
                    {promosFiltrados.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-2 text-sm text-zinc-400">
                        <p>Sin promos aún</p>
                        <button onClick={() => setPromoTab('crear')}
                          className="text-xs text-violet-600 font-semibold hover:text-violet-800">
                          Crear el primero →
                        </button>
                      </div>
                    ) : promosFiltrados.map(p => {
                      const promoLabel = p.en_promo === 2 ? 'OFERTA' : p.en_promo === 3 ? 'REGALO' : 'COMBO';
                      const promoBg    = p.en_promo === 2 ? 'bg-amber-500' : p.en_promo === 3 ? 'bg-rose-500' : 'bg-violet-500';
                      return (
                        <button key={p.id} onClick={() => agregarDesdePromoModal(p)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 text-left transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${promoBg}`}>{promoLabel}</span>
                              <p className="text-sm font-medium text-zinc-800 truncate">{p.nombre}</p>
                            </div>
                            {p.combo_items && p.combo_items.length > 0 && (
                              <p className="text-[10px] text-zinc-400 truncate">
                                {p.combo_items.map((ci: import('@/lib/api').ComboItem) => `${ci.componente?.nombre ?? `#${ci.componente_producto_id}`}${ci.cantidad !== 1 ? ` ×${ci.cantidad}` : ''}`).join(' + ')}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-violet-700 tabular-nums">{fmt(p.precio_venta)}</p>
                            <p className="text-[10px] text-zinc-400">{p.stock} uds</p>
                          </div>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-300 shrink-0">
                            <line x1="0" y1="7" x2="12" y2="7"/><polyline points="7 2 12 7 7 12"/>
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* ── Crear promo/combo ── */
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                  {/* Selector de tipo */}
                  <div className="flex rounded-xl overflow-hidden border border-zinc-200">
                    {([1, 2, 3] as const).map(t => (
                      <button key={t} onClick={() => setCrearEnPromo(t)}
                        className={`flex-1 py-2 text-xs font-bold transition-colors ${crearEnPromo === t ? 'text-white' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}
                        style={crearEnPromo === t ? { background: promoTypeColors[t].replace('bg-', '').includes('violet') ? 'var(--brand-purple)' : promoTypeColors[t] === 'bg-amber-500' ? '#f59e0b' : '#f43f5e' } : {}}>
                        {promoTypeLabels[t]}
                      </button>
                    ))}
                  </div>

                  {/* Buscar y agregar componente */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Agregar producto al combo</label>
                    <input
                      type="text" value={crearSearch}
                      onChange={e => setCrearSearch(e.target.value)}
                      placeholder="Buscar por nombre o código…"
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-violet-400"
                    />
                    {sugeridos.length > 0 && (
                      <div className="mt-1 border border-zinc-100 rounded-xl overflow-hidden shadow-sm">
                        {sugeridos.map(p => (
                          <button key={p.id} type="button"
                            onClick={() => {
                              setCrearComponentes(prev => {
                                const existing = prev.find(ci => ci.producto_id === p.id);
                                if (existing) return prev.map(ci => ci.producto_id === p.id ? { ...ci, cantidad: ci.cantidad + 1 } : ci);
                                return [...prev, { producto_id: p.id, nombre: p.nombre, cantidad: 1 }];
                              });
                              setCrearSearch('');
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-violet-50 flex items-center justify-between border-b border-zinc-50 last:border-0">
                            <span className="font-medium text-zinc-700 truncate">{p.nombre}</span>
                            <span className="text-zinc-400 shrink-0 ml-2">stock: {p.stock}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lista de componentes */}
                  {crearComponentes.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-500">Componentes ({crearComponentes.length})</p>
                      {crearComponentes.map((ci, idx) => (
                        <div key={ci.producto_id} className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2">
                          <span className="flex-1 text-xs font-medium text-zinc-700 truncate">{ci.nombre}</span>
                          <input type="number" min="1" step="1"
                            value={ci.cantidad}
                            onChange={e => setCrearComponentes(prev => prev.map((x, i) => i === idx ? { ...x, cantidad: Math.max(1, Math.round(Number(e.target.value))) } : x))}
                            className="w-14 px-2 py-1 text-xs border border-zinc-200 rounded-lg text-center focus:outline-none focus:border-violet-400"
                          />
                          <span className="text-[10px] text-zinc-400">uds</span>
                          <button type="button"
                            onClick={() => setCrearComponentes(prev => prev.filter((_, i) => i !== idx))}
                            className="text-rose-300 hover:text-rose-600 text-xs px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors">✕</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-300 text-center py-2">Sin componentes — buscá un producto arriba</p>
                  )}

                  {/* Precio */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Precio de venta *</label>
                    <input
                      type="number" step="1" min="0"
                      value={crearPrecio}
                      onChange={e => setCrearPrecio(e.target.value)}
                      placeholder="Ej: 2800"
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
                    />
                    {margen !== null && (
                      <p className={`text-xs mt-1.5 font-semibold ${margen >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        Margen: {margen > 0 ? '+' : ''}{margen}% sobre costo estimado {fmt(costoEst)}
                      </p>
                    )}
                    {costoEst === 0 && crearComponentes.length > 0 && (
                      <p className="text-xs text-zinc-400 mt-1">Sin precio de compra — ingresá compras para ver margen.</p>
                    )}
                  </div>

                  <button
                    onClick={crearComboYAgregar}
                    disabled={crearComponentes.length === 0 || !crearPrecio || creandoCombo}
                    className="w-full py-3 text-sm font-semibold rounded-xl text-white disabled:opacity-40 transition-colors"
                    style={{ background: 'var(--brand-purple)' }}
                  >
                    {creandoCombo ? 'Creando…' : `Crear ${promoTypeLabels[crearEnPromo]} y agregar al carrito`}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Modal número de factura ── */}
      {showFacturaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFacturaModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-zinc-900">¿Número de factura?</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Ingresá el número o dejá en 0 si no tiene.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const n = parseInt(nroFactura.replace(/\D/g, ''), 10);
                  if (!isNaN(n) && n > 1) setNroFactura(String(n - 1).padStart(nroFactura.length, '0'));
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-lg font-bold transition-colors flex-shrink-0"
              >−</button>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={nroFactura}
                onChange={e => setNroFactura(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') ejecutarVenta(nroFactura); }}
                placeholder="Ej: 000123"
                className="flex-1 px-4 py-3 text-sm text-center border border-zinc-200 rounded-xl focus:outline-none focus:border-[var(--brand-purple)] transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  const n = parseInt(nroFactura.replace(/\D/g, ''), 10);
                  if (!isNaN(n)) setNroFactura(String(n + 1).padStart(nroFactura.length, '0'));
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-lg font-bold transition-colors flex-shrink-0"
              >+</button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => ejecutarVenta('0')}
                className="flex-1 py-3 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Sin factura
              </button>
              <button
                onClick={() => ejecutarVenta(nroFactura)}
                className="flex-1 py-3 text-sm font-bold rounded-xl text-white transition-colors"
                style={{ background: 'var(--brand-teal)' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal fraccionar granel ── */}
      {fraccionarGranel && (
        <FraccionarGranelModal
          producto={fraccionarGranel}
          onClose={() => setFraccionarGranel(null)}
          onAgregar={(kg, precioKg) => {
            agregarGranelAlCarrito(fraccionarGranel, kg, precioKg);
            setFraccionarGranel(null);
          }}
        />
      )}

      {/* ── Modal guardar carrito ── */}
      {guardarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGuardarModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-zinc-900">Guardar carrito</h2>
            <input
              autoFocus
              type="text"
              value={guardarNombre}
              onChange={e => setGuardarNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && guardarNombre.trim()) { guardarCarrito(guardarNombre.trim()); } }}
              placeholder="Nombre del carrito…"
              className="w-full px-4 py-3 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-[var(--brand-purple)] transition-colors"
            />
            <div className="flex gap-2">
              <button onClick={() => setGuardarModalOpen(false)} className="flex-1 py-3 text-sm rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50">Cancelar</button>
              <button
                onClick={() => guardarCarrito(guardarNombre.trim())}
                disabled={!guardarNombre.trim()}
                className="flex-1 py-3 text-sm font-bold rounded-xl text-white disabled:opacity-40"
                style={{ background: 'var(--brand-purple)' }}
              >Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal cargar carrito ── */}
      {cargarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCargarModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col" style={{ maxHeight: '70vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
              <h2 className="font-bold text-zinc-900">Carritos guardados</h2>
              <button onClick={() => setCargarModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="15" y2="15"/><line x1="15" y1="1" x2="1" y2="15"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
              {carritoGuardados.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-zinc-400">No hay carritos guardados</div>
              ) : carritoGuardados.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 truncate">{c.nombre}</p>
                    <p className="text-xs text-zinc-400">{c.fecha} · {c.items.length} líneas</p>
                  </div>
                  <button
                    onClick={() => {
                      if (carrito.length > 0 && !confirm('¿Reemplazar el carrito actual?')) return;
                      setCarrito(c.items);
                      setCargarModalOpen(false);
                    }}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
                    style={{ background: 'var(--brand-purple)' }}
                  >Cargar</button>
                  <button
                    onClick={() => eliminarCarritoGuardado(c.id)}
                    className="shrink-0 text-zinc-300 hover:text-rose-400 transition-colors"
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="12" y2="12"/><line x1="12" y1="1" x2="1" y2="12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal venta exitosa ── */}
      {ventaModal && (
        <>
          <style>{`
            @keyframes ventaOk {
              0%   { opacity: 0; transform: scale(0.72) translateY(12px); }
              60%  { transform: scale(1.04) translateY(-2px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes checkDraw {
              from { stroke-dashoffset: 30; opacity: 0; }
              to   { stroke-dashoffset: 0;  opacity: 1; }
            }
          `}</style>
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
            <div
              className="bg-white rounded-3xl shadow-2xl p-7 flex flex-col items-center gap-4 w-full max-w-xs"
              style={{ animation: 'ventaOk 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
            >
              {/* Logo */}
              <img src="/logo.png" alt="Zamoritos" className="h-12 w-auto" />

              {/* Check animado */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.12)' }}>
                <svg width="36" height="36" fill="none" stroke="#10b981" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 18 15 26 29 10"
                    strokeDasharray="30" strokeDashoffset="0"
                    style={{ animation: 'checkDraw 0.4s 0.1s ease-out both' }} />
                </svg>
              </div>

              {/* Texto */}
              <div className="text-center">
                <p className="text-lg font-bold text-zinc-800 tracking-tight">¡Venta registrada!</p>
                <p className="text-3xl font-black tabular-nums mt-1" style={{ color: 'var(--brand-purple)' }}>
                  {fmt(ventaModal.total)}
                </p>
              </div>

              {/* Alertas de stock */}
              {ventaModal.stockAlerts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 w-full">
                  <p className="text-xs font-bold text-amber-700 mb-1.5 flex items-center gap-1">
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
                    </svg>
                    Stock bajo
                  </p>
                  {ventaModal.stockAlerts.map(a => (
                    <p key={a.nombre} className="text-xs text-amber-600 truncate">
                      {a.nombre}: <span className="font-bold">{a.stock} restantes</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Carrito Panel ─────────────────────────────────────────────────────────────

interface PagoLinea {
  medio: MedioPago;
  monto: string; // string para permitir edición parcial
}

interface CarritoPanelProps {
  carrito:           LineaCarrito[];
  total:             number;
  tipoPago:          'contado' | 'credito';
  medioPago:         string;
  modoPago:          'unico' | 'combinado';
  pagos:             PagoLinea[];
  submitting:        boolean;
  creditoCanje:      number;
  onClearCanje:      () => void;
  onCambiarCantidad: (key: string, delta: number) => void;
  onCambiarPrecio:   (key: string, precio: string) => void;
  onQuitarItem:      (key: string) => void;
  onVaciar:          () => void;
  onTipoPago:        (v: 'contado' | 'credito') => void;
  onMedioPago:       (v: string) => void;
  onModoPago:        (v: 'unico' | 'combinado') => void;
  onSetPagos:        (p: PagoLinea[]) => void;
  onConfirmar:       () => void;
  onGuardar:         () => void;
  onCargar:          () => void;
  hayGuardados:      boolean;
}

const CarritoPanel = memo(function CarritoPanel({
  carrito, total, tipoPago, medioPago, modoPago, pagos, submitting,
  creditoCanje, onClearCanje,
  onCambiarCantidad, onCambiarPrecio, onQuitarItem, onVaciar,
  onTipoPago, onMedioPago, onModoPago, onSetPagos, onConfirmar,
  onGuardar, onCargar, hayGuardados,
}: CarritoPanelProps) {
  const totalItems  = carrito.reduce((s, l) => s + l.cantidad, 0);
  const totalAPagar = Math.max(0, total - creditoCanje);
  const sobrante    = Math.max(0, creditoCanje - total);
  const sumPagos    = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const restante    = Math.max(0, totalAPagar - sumPagos);
  const pagoOk      = modoPago === 'unico' || Math.abs(sumPagos - totalAPagar) < 0.01;

  const addPago = () => {
    const medioDisponible = MEDIOS_PAGO.find(m => !pagos.some(p => p.medio === m.value))?.value ?? 'efectivo';
    onSetPagos([...pagos, { medio: medioDisponible, monto: String(restante > 0 ? restante : '') }]);
  };

  const removePago = (idx: number) => onSetPagos(pagos.filter((_, i) => i !== idx));

  const updatePago = (idx: number, field: 'medio' | 'monto', value: string) =>
    onSetPagos(pagos.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const completarConRestante = (idx: number) =>
    onSetPagos(pagos.map((p, i) => i === idx ? { ...p, monto: String(restante + (parseFloat(p.monto) || 0)) } : p));

  // When switching to combined, pre-populate with current single method
  const handleModoPago = (v: 'unico' | 'combinado') => {
    if (v === 'combinado' && pagos.length === 0) {
      onSetPagos([{ medio: medioPago as MedioPago, monto: String(total) }]);
    }
    if (v === 'unico') onSetPagos([]);
    onModoPago(v);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">

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
        <div className="flex items-center gap-2">
          {hayGuardados && (
            <button onClick={onCargar} title="Cargar carrito guardado"
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-violet-600 transition-colors">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Cargar
            </button>
          )}
          {carrito.length > 0 && (
            <button onClick={onGuardar} title="Guardar carrito"
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-600 transition-colors">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              Guardar
            </button>
          )}
          {carrito.length > 0 && (
            <button onClick={onVaciar} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-500 transition-colors">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Vaciar
            </button>
          )}
        </div>
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
            {carrito.map(l => {
              const esAjusteNeg = l.precio_unitario < 0;
              return (
              <div key={l.key} className={`px-4 py-3 flex items-start gap-3 group transition-colors ${esAjusteNeg ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-zinc-50/50'}`}>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug line-clamp-2 ${esAjusteNeg ? 'text-rose-700' : 'text-zinc-800'}`}>{l.producto.nombre}</p>
                  {/* Precio editable */}
                  {l.esGranel && l.granelKg != null ? (
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-xs text-zinc-400">$</span>
                      <input
                        type="number"
                        value={l.granelPrecioKg ?? ''}
                        onChange={e => onCambiarPrecio(l.key, e.target.value)}
                        className="w-20 text-xs border border-zinc-200 rounded-lg px-1.5 py-0.5 focus:outline-none focus:border-[var(--brand-purple)] tabular-nums"
                      />
                      <span className="text-xs text-zinc-400">/kg</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-xs text-zinc-400">$</span>
                      <input
                        type="number"
                        value={l.precio_unitario}
                        onChange={e => onCambiarPrecio(l.key, e.target.value)}
                        className="w-20 text-xs border border-zinc-200 rounded-lg px-1.5 py-0.5 focus:outline-none focus:border-[var(--brand-purple)] tabular-nums"
                      />
                      <span className="text-xs text-zinc-400">c/u</span>
                    </div>
                  )}
                </div>
                {/* Controles cantidad */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onCambiarCantidad(l.key, -1)}
                      className="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold transition-colors flex items-center justify-center text-base leading-none"
                    >−</button>
                    {l.esGranel && l.granelKg != null ? (
                      <span className="w-16 text-center text-sm font-bold tabular-nums text-zinc-900">
                        {l.granelKg >= 1
                          ? `${l.granelKg % 1 === 0 ? l.granelKg : l.granelKg.toFixed(2)} kg`
                          : `${Math.round(l.granelKg * 1000)} g`}
                      </span>
                    ) : (
                      <span className="w-7 text-center text-sm font-bold tabular-nums text-zinc-900">{l.cantidad}</span>
                    )}
                    <button
                      onClick={() => onCambiarCantidad(l.key, 1)}
                      className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-600 font-bold transition-colors flex items-center justify-center text-base leading-none"
                    >+</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold tabular-nums ${esAjusteNeg ? 'text-rose-600' : 'text-zinc-700'}`}>
                      {l.esGranel && l.granelKg != null && l.granelPrecioKg
                        ? `$${Math.round(l.granelKg * l.granelPrecioKg).toLocaleString('es-CL')}`
                        : fmt(l.cantidad * l.precio_unitario)}
                    </span>
                    <button
                      onClick={() => onQuitarItem(l.key)}
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
              );
            })}
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
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Medio de pago</p>
            <button
              onClick={() => handleModoPago(modoPago === 'unico' ? 'combinado' : 'unico')}
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                modoPago === 'combinado'
                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                  : 'text-zinc-400 border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
            >
              {modoPago === 'combinado' ? '✓ Pago combinado' : 'Dividir pago'}
            </button>
          </div>

          {modoPago === 'unico' ? (
            <div className="grid grid-cols-4 gap-1">
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
          ) : (
            <div className="space-y-1.5">
              {pagos.map((pago, idx) => {
                const pagoRestante = total - pagos.reduce((s, p, i) => i !== idx ? s + (parseFloat(p.monto) || 0) : s, 0);
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <select
                      value={pago.medio}
                      onChange={e => updatePago(idx, 'medio', e.target.value)}
                      className="flex-1 text-xs border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-400 bg-white"
                    >
                      {MEDIOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">$</span>
                      <input
                        type="number"
                        min={0}
                        value={pago.monto}
                        onChange={e => updatePago(idx, 'monto', e.target.value)}
                        className="w-24 pl-5 pr-1 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-violet-400 tabular-nums"
                      />
                    </div>
                    {pagoRestante > 0.01 && (
                      <button
                        onClick={() => completarConRestante(idx)}
                        title={`Completar con ${fmt(pagoRestante)}`}
                        className="text-[9px] text-violet-600 border border-violet-200 rounded-lg px-1.5 py-1.5 hover:bg-violet-50 whitespace-nowrap"
                      >
                        +{fmt(pagoRestante)}
                      </button>
                    )}
                    <button
                      onClick={() => removePago(idx)}
                      className="text-zinc-300 hover:text-rose-400 transition-colors shrink-0"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
              <button
                onClick={addPago}
                disabled={pagos.length >= MEDIOS_PAGO.length}
                className="w-full py-1.5 text-xs text-violet-600 border border-dashed border-violet-200 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Agregar método
              </button>
              {/* Balance */}
              {pagos.length > 0 && (
                <div className={`flex justify-between text-xs px-1 font-semibold ${
                  Math.abs(sumPagos - total) < 0.01 ? 'text-emerald-600' : restante > 0 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  <span>{Math.abs(sumPagos - total) < 0.01 ? '✓ Saldo cubierto' : restante > 0 ? `Faltan ${fmt(restante)}` : `Excede ${fmt(sumPagos - total)}`}</span>
                  <span>{fmt(sumPagos)} / {fmt(total)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Crédito por devolución */}
        {creditoCanje > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg width="13" height="13" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-1"/>
                </svg>
                <span className="text-xs font-semibold text-amber-800">Crédito por devolución</span>
              </div>
              <button onClick={onClearCanje} className="text-[9px] text-amber-500 hover:text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">Quitar</button>
            </div>
            <div className="flex justify-between text-xs text-amber-700 font-mono">
              <span>Mercadería</span><span>{fmt(total)}</span>
            </div>
            <div className="flex justify-between text-xs text-amber-700 font-mono">
              <span>− Crédito</span><span>−{fmt(creditoCanje)}</span>
            </div>
            {sobrante > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 font-mono border-t border-amber-200 pt-1">
                <span>Sobrante caja</span><span>+{fmt(sobrante)}</span>
              </div>
            )}
          </div>
        )}

        {/* Total */}
        <div className="flex items-baseline justify-between py-1 px-1">
          <span className="text-sm text-zinc-500 font-medium">{creditoCanje > 0 ? 'A pagar' : 'Total'}</span>
          <span className="text-2xl font-bold tabular-nums text-zinc-900">
            {fmt(creditoCanje > 0 ? totalAPagar : total)}
          </span>
        </div>

        {/* Botón confirmar */}
        <button
          onClick={onConfirmar}
          disabled={carrito.length === 0 || submitting || !pagoOk}
          className="w-full py-4 font-bold text-base rounded-2xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-white"
          style={{ background: carrito.length > 0 && !submitting && pagoOk ? 'var(--brand-teal)' : '#9ca3af' }}
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
              {`Confirmar venta${carrito.length > 0 ? ' · ' + fmt(creditoCanje > 0 ? totalAPagar : total) : ''}`}
            </span>
          )}
        </button>
      </div>
    </div>
  );
});

// ─── Modal Fraccionamiento ────────────────────────────────────────────────────

/** Detecta si el producto se fracciona en unidades (pastillas, comprimidos, etc.) */
function detectarModoFraccion(nombre: string): 'kg' | 'unidad' {
  const n = nombre.toLowerCase();
  const palabrasUnidad = ['pastilla', 'comprimido', 'tableta', 'cápsula', 'capsula',
    'ampolla', 'blíster', 'blister', 'sobre', 'sachet', 'frasco', 'unidad', 'pildora',
    'píldora', 'antiparasit', 'desparasit', 'gragea', 'suposit'];
  return palabrasUnidad.some(p => n.includes(p)) ? 'unidad' : 'kg';
}

function FraccionarModal({
  producto,
  onClose,
  onDone,
}: {
  producto: Producto;
  onClose: () => void;
  onDone: (r: FraccionarResult) => void;
}) {
  const cantPorEnv      = producto.peso ?? 1;   // kg/bolsa  ó  unidades/caja
  const [modo, setModo] = useState<'kg' | 'unidad'>(producto.modo_fraccion ?? detectarModoFraccion(producto.nombre));

  const labelEnvase   = modo === 'unidad' ? 'envase' : 'bolsa';
  const labelEnvases  = modo === 'unidad' ? 'envases' : 'bolsas';
  const labelUnidad   = modo === 'unidad' ? 'unidades' : 'kg';
  const labelPorEnv   = modo === 'unidad' ? `${cantPorEnv} uds/envase` : `${cantPorEnv} kg/bolsa`;

  const costoPorUnidad    = producto.precio_compra != null ? producto.precio_compra / cantPorEnv : null;
  const precioSugerido    = Math.ceil(producto.precio_venta / cantPorEnv);
  const codigoAnexo       = (producto.codigo_barras ?? '').replace(/\*$/, '') + '-F';

  const pctInicial = costoPorUnidad
    ? Math.round(((precioSugerido / costoPorUnidad) - 1) * 100)
    : 30;

  const [bolsas,       setBolsas]      = useState(1);
  const [precio,       setPrecio]      = useState(precioSugerido);
  const [pctGanancia,  setPctGanancia] = useState(pctInicial);
  const [usarPct,      setUsarPct]     = useState(!!costoPorUnidad);
  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState('');

  const handlePct = (pct: number) => {
    setPctGanancia(pct);
    if (costoPorUnidad && usarPct) {
      setPrecio(Math.ceil(costoPorUnidad * (1 + pct / 100)));
    }
  };

  // Recalcular precio sugerido cuando cambia el modo
  const handleModo = (m: 'kg' | 'unidad') => {
    setModo(m);
    setPrecio(Math.ceil(producto.precio_venta / cantPorEnv));
    setUsarPct(!!costoPorUnidad);
  };

  const unidadesGeneradas = bolsas * cantPorEnv;

  const confirmar = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.post<FraccionarResult>(
        `/productos/${producto.id}/fraccionar`,
        { cantidad_bolsas: bolsas, precio_fraccionado: precio, modo_fraccion: modo }
      );
      onDone(r);
    } catch (e: unknown) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Fraccionar producto" size="lg">
      <div className="space-y-5">
        {/* Toggle modo */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-200">
          {(['kg', 'unidad'] as const).map(m => (
            <button
              key={m}
              onClick={() => handleModo(m)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                modo === m
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {m === 'kg' ? '⚖ Por kg (alimento)' : '💊 Por unidad (pastillas)'}
            </button>
          ))}
        </div>

        {/* Info producto */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Producto origen</p>
          <p className="text-sm font-semibold text-zinc-900 leading-snug">{producto.nombre}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span>Stock: <strong className="text-zinc-800">{producto.stock} {labelEnvase}{producto.stock !== 1 ? 's' : ''}</strong></span>
            <span>·</span>
            <span><strong className="text-zinc-800">{labelPorEnv}</strong></span>
          </div>
        </div>

        {/* Aviso última unidad */}
        {bolsas >= producto.stock && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            <svg className="text-rose-400 shrink-0 mt-0.5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-xs text-rose-700">
              Estás fraccionando el último {producto.stock === 1 ? labelEnvase : labelEnvases}.
              El stock quedará en <strong>0</strong> después de esta operación.
            </p>
          </div>
        )}

        {/* Cantidad */}
        <div className="flex items-center justify-between gap-4 py-1">
          <button
            onClick={() => setBolsas(b => Math.max(1, b - 1))}
            className="w-16 h-16 shrink-0 rounded-full bg-rose-100 hover:bg-rose-200 active:scale-95 text-rose-500 text-4xl font-light flex items-center justify-center transition-all select-none"
          >−</button>
          <div className="flex-1 text-center">
            <input
              type="number"
              min={1}
              max={Math.floor(producto.stock)}
              value={bolsas}
              onChange={e => setBolsas(Math.min(Math.floor(producto.stock), Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full text-center text-5xl font-black text-zinc-900 bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <p className="text-xs text-zinc-400 mt-0.5">de {producto.stock} {labelEnvases}</p>
          </div>
          <button
            onClick={() => setBolsas(b => Math.min(Math.floor(producto.stock), b + 1))}
            className="w-16 h-16 shrink-0 rounded-full bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-emerald-600 text-4xl font-light flex items-center justify-center transition-all select-none"
          >+</button>
        </div>

        {/* Preview generación */}
        <div className="bg-zinc-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Generará</p>
            <p className="text-2xl font-bold text-zinc-900">{unidadesGeneradas} <span className="text-sm font-normal">{labelUnidad}</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Código anexo</p>
            <p className="text-sm font-mono font-bold text-amber-600">{codigoAnexo}</p>
          </div>
        </div>

        {/* Precio fraccionado + % ganancia */}
        <div className="space-y-3">
          {/* Costo por unidad */}
          {costoPorUnidad != null && (
            <div className="bg-zinc-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Costo compra/{labelUnidad.replace('es', '').replace('s','') || labelUnidad}</span>
              <span className="text-sm font-bold text-zinc-700 tabular-nums">{fmt(costoPorUnidad)}/{modo === 'kg' ? 'kg' : 'ud'}</span>
            </div>
          )}

          {/* % ganancia (solo si hay precio_compra) */}
          {costoPorUnidad != null && (
            <div>
              <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                % Ganancia
                <span className="text-zinc-400 font-normal ml-1">(sobre costo)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={1} max={200} value={pctGanancia}
                  onChange={e => handlePct(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
                  <input
                    type="number" min={1} max={200} value={pctGanancia}
                    onChange={e => handlePct(Number(e.target.value))}
                    className="w-14 text-center text-sm font-bold py-1.5 focus:outline-none"
                  />
                  <span className="px-2 text-xs text-zinc-400 bg-zinc-50 border-l border-zinc-200 py-1.5">%</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-600">Precio por {modo === 'kg' ? 'kg' : 'unidad'}</label>
              <button
                onClick={() => { setPrecio(precioSugerido); setUsarPct(false); }}
                className="text-[10px] text-amber-600 hover:underline"
              >
                Desde precio {labelEnvase}: {fmt(precioSugerido)}/{modo === 'kg' ? 'kg' : 'ud'}
              </button>
            </div>
            <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-3 py-2 focus-within:border-amber-400 transition-colors">
              <span className="text-sm text-zinc-400 font-medium">$</span>
              <input
                type="number" min={0} step={1} value={Math.round(precio)}
                onChange={e => { setPrecio(Math.round(Number(e.target.value))); setUsarPct(false); }}
                className="flex-1 min-w-0 text-base font-bold focus:outline-none bg-transparent"
              />
              <span className="text-xs text-zinc-400">/{modo === 'kg' ? 'kg' : 'ud'}</span>
            </div>
            {costoPorUnidad != null && precio > 0 && (
              <p className="text-[10px] text-zinc-400 mt-1">
                Margen real: <strong className={`${((precio / costoPorUnidad - 1) * 100) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {Math.round((precio / costoPorUnidad - 1) * 100)}%
                </strong>
                {' · '}Total inventario: <strong className="text-zinc-700">{fmt(unidadesGeneradas * precio)}</strong>
              </p>
            )}
            {costoPorUnidad == null && (
              <p className="text-[10px] text-zinc-400 mt-1">
                Total a generar: <strong className="text-zinc-700">{fmt(unidadesGeneradas * precio)}</strong> en inventario
              </p>
            )}
          </div>
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
              `Fraccionar ${bolsas} ${bolsas > 1 ? labelEnvases : labelEnvase}`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── FraccionarGranelModal ────────────────────────────────────────────────────

function FraccionarGranelModal({
  producto,
  onClose,
  onAgregar,
}: {
  producto: Producto;
  onClose: () => void;
  onAgregar: (kg: number, precioKg: number) => void;
}) {
  const peso = producto.peso ?? 1;
  const stockKgTotal = producto.stock * peso;
  const precioKgSugerido = producto.precio_venta > 0 ? Math.ceil(producto.precio_venta / peso) : 0;

  const [unidad,   setUnidad]  = useState<'kg' | 'g'>('kg');
  const [cantidad, setCantidad] = useState('');
  const [precioKg, setPrecioKg] = useState(String(precioKgSugerido));

  const cantKg = (() => {
    const n = parseFloat(cantidad.replace(',', '.')) || 0;
    return unidad === 'g' ? n / 1000 : n;
  })();
  const subtotal = cantKg * (parseFloat(precioKg) || 0);
  const excede   = cantKg > stockKgTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-80 p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wide">Fraccionar · Venta a granel</p>
          <p className="text-sm font-semibold text-zinc-800 leading-snug mt-0.5">{producto.nombre}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Stock aprox: <strong className="text-zinc-700">{stockKgTotal % 1 === 0 ? stockKgTotal : stockKgTotal.toFixed(1)} kg</strong>
            {` (${producto.stock} ${producto.stock === 1 ? 'bolsa' : 'bolsas'} × ${peso} kg)`}
          </p>
        </div>

        {/* Unidad toggle */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-200">
          {(['kg', 'g'] as const).map(u => (
            <button
              key={u}
              onClick={() => setUnidad(u)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                unidad === u ? 'bg-amber-500 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {u === 'kg' ? 'Kilogramos (kg)' : 'Gramos (g)'}
            </button>
          ))}
        </div>

        {/* Cantidad */}
        <div>
          <label className="text-xs text-zinc-500 font-medium block mb-1.5">Cantidad ({unidad})</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const step = unidad === 'kg' ? 0.5 : 100;
                const cur = parseFloat(cantidad.replace(',', '.')) || 0;
                if (cur > step) setCantidad(String(+(cur - step).toFixed(3)));
              }}
              className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center text-lg font-bold text-zinc-500 hover:bg-zinc-100"
            >−</button>
            <input
              autoFocus
              type="number" step={unidad === 'kg' ? '0.1' : '50'} min="0.001"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-center text-lg font-bold tabular-nums focus:outline-none focus:border-zinc-400"
              placeholder={unidad === 'kg' ? '0.5' : '500'}
            />
            <button
              onClick={() => {
                const step = unidad === 'kg' ? 0.5 : 100;
                const cur = parseFloat(cantidad.replace(',', '.')) || 0;
                setCantidad(String(+(cur + step).toFixed(3)));
              }}
              className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center text-lg font-bold text-zinc-500 hover:bg-zinc-100"
            >+</button>
          </div>
        </div>

        {/* Precio */}
        <div>
          <label className="text-xs text-zinc-500 font-medium block mb-1.5">Precio / kg</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">$</span>
            <input
              type="number" min={0}
              value={precioKg}
              onChange={e => setPrecioKg(e.target.value)}
              className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-center text-lg font-bold tabular-nums focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        {cantKg > 0 && (
          <p className="text-xs text-zinc-500 text-center">
            Subtotal: <strong className="text-zinc-800">${Math.round(subtotal).toLocaleString('es-CL')}</strong>
            {excede && <span className="text-rose-500 ml-2">⚠ supera el stock</span>}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50">Cancelar</button>
          <button
            disabled={cantKg <= 0 || excede || !precioKg}
            onClick={() => onAgregar(cantKg, parseFloat(precioKg) || 0)}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-40"
            style={{ background: 'var(--brand-teal)' }}
          >
            Agregar {cantKg > 0 ? (unidad === 'kg' ? `${cantKg.toFixed(2)} kg` : `${Math.round(cantKg * 1000)} g`) : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Historial ────────────────────────────────────────────────────────────────

type Periodo = 'hoy' | 'semana' | 'mes' | 'todo';

function HistorialPanel({ onIniciarCanje }: { onIniciarCanje: (amt: number, medio?: string) => void }) {
  const [ventas,          setVentas]          = useState<Venta[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [detalle,         setDetalle]         = useState<Venta | null>(null);
  const [anulando,        setAnulando]        = useState<number | null>(null);
  const [periodo,         setPeriodo]         = useState<Periodo>('hoy');
  const [sicfeOpen,       setSicfeOpen]       = useState(false);
  const [devolucionVenta, setDevolucionVenta] = useState<Venta | null>(null);
  const [filtroFactura,   setFiltroFactura]   = useState('');
  const [sortCol,         setSortCol]         = useState<'id' | 'numero_factura' | 'estado' | 'tipo_pago'>('id');
  const [sortDir,         setSortDir]         = useState<'asc' | 'desc'>('desc');

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const getParams = () => {
    const today = new Date().toISOString().slice(0, 10);
    const d = new Date();
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    switch (periodo) {
      case 'hoy':    return `?fecha_desde=${today}&fecha_hasta=${today}`;
      case 'semana': return `?fecha_desde=${weekStart.toISOString().slice(0,10)}&fecha_hasta=${today}`;
      case 'mes':    return `?fecha_desde=${monthStart.toISOString().slice(0,10)}&fecha_hasta=${today}`;
      default:       return '';
    }
  };

  const load = () => {
    setLoading(true);
    api.get<VentasPaginado>(`/ventas${getParams()}`)
      .then(r => { setVentas(r.data); setLoading(false); });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [periodo]);

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
    master:        'bg-red-50 text-red-700',
    anda:          'bg-sky-50 text-sky-700',
    cabal:         'bg-purple-50 text-purple-700',
    transferencia: 'bg-violet-50 text-violet-700',
    otro:          'bg-zinc-100 text-zinc-600',
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Historial de ventas</h2>
          <p className="text-sm text-zinc-400 mt-0.5">{ventas.length} ventas en el período</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSicfeOpen(true)}
            className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 hover:border-violet-300 bg-violet-50 transition-colors"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Importar SICFE
          </button>
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
      </div>

      {/* Period filter */}
      <div className="flex gap-1 mb-4 bg-zinc-100 p-1 rounded-xl w-fit">
        {([
          { key: 'hoy',    label: 'Hoy' },
          { key: 'semana', label: 'Semana' },
          { key: 'mes',    label: 'Mes' },
          { key: 'todo',   label: 'Todo' },
        ] as { key: Periodo; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriodo(key)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-[9px] transition-colors ${
              periodo === key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {!loading && ventas.length > 0 && (() => {
        const confirmadas = ventas.filter(v => v.estado === 'confirmada');
        const totalSum    = confirmadas.reduce((s, v) => s + v.total, 0);
        const conFactura  = confirmadas.filter(v => v.numero_factura);
        const sinFactura  = confirmadas.filter(v => !v.numero_factura);
        const totalConFac = conFactura.reduce((s, v) => s + v.total, 0);
        const totalSinFac = sinFactura.reduce((s, v) => s + v.total, 0);
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {/* Total general */}
            <div className="col-span-2 sm:col-span-2 bg-white border border-zinc-100 rounded-xl px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-0.5">Total del período</p>
                <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--brand-purple)' }}>{fmt(totalSum)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-0.5">Ventas</p>
                <p className="text-2xl font-bold text-zinc-700 tabular-nums">{confirmadas.length}</p>
              </div>
            </div>
            {/* Con factura */}
            <button
              onClick={() => setFiltroFactura(filtroFactura === '__con__' ? '' : '__con__')}
              className={`rounded-xl px-4 py-3 text-left border-2 transition-all ${
                filtroFactura === '__con__'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-blue-50 border-blue-200 hover:border-blue-400'
              }`}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${filtroFactura === '__con__' ? 'text-blue-200' : 'text-blue-500'}`}>
                Con factura · {conFactura.length}
              </p>
              <p className={`text-xl font-bold tabular-nums ${filtroFactura === '__con__' ? 'text-white' : 'text-blue-700'}`}>
                {fmt(totalConFac)}
              </p>
            </button>
            {/* Sin factura */}
            <button
              onClick={() => setFiltroFactura(filtroFactura === '__sin__' ? '' : '__sin__')}
              className={`rounded-xl px-4 py-3 text-left border-2 transition-all ${
                filtroFactura === '__sin__'
                  ? 'bg-zinc-600 border-zinc-600 text-white'
                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${filtroFactura === '__sin__' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                Sin factura · {sinFactura.length}
              </p>
              <p className={`text-xl font-bold tabular-nums ${filtroFactura === '__sin__' ? 'text-white' : 'text-zinc-700'}`}>
                {fmt(totalSinFac)}
              </p>
            </button>
          </div>
        );
      })()}

      {/* Filtro factura */}
      <div className="mb-3 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5.5" cy="5.5" r="4.5"/><line x1="9" y1="9" x2="13" y2="13"/>
        </svg>
        <input
          value={filtroFactura.startsWith('__') ? '' : filtroFactura}
          onChange={e => setFiltroFactura(e.target.value)}
          placeholder="Filtrar por N° factura…"
          className="w-full pl-9 pr-8 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:border-zinc-400"
        />
        {filtroFactura && (
          <button onClick={() => setFiltroFactura('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
          </button>
        )}
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
            <p className="text-sm text-zinc-400">Sin ventas en el período</p>
          </div>
        ) : (() => {
          const ventasFiltradas = ventas
            .filter(v => {
              if (!filtroFactura) return true;
              if (filtroFactura === '__con__') return !!v.numero_factura;
              if (filtroFactura === '__sin__') return !v.numero_factura;
              return (v.numero_factura ?? '').toLowerCase().includes(filtroFactura.toLowerCase());
            })
            .sort((a, b) => {
              let va: string | number, vb: string | number;
              if (sortCol === 'id')             { va = a.id;             vb = b.id; }
              else if (sortCol === 'numero_factura') { va = a.numero_factura ?? ''; vb = b.numero_factura ?? ''; }
              else if (sortCol === 'estado')    { va = a.estado;         vb = b.estado; }
              else                              { va = a.tipo_pago;      vb = b.tipo_pago; }
              if (va < vb) return sortDir === 'asc' ? -1 : 1;
              if (va > vb) return sortDir === 'asc' ? 1 : -1;
              return 0;
            });
          return (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    {([
                      { label: '#',       col: 'id'             },
                      { label: 'Fecha',   col: null             },
                      { label: 'Factura', col: 'numero_factura' },
                      { label: 'Pago',    col: 'tipo_pago'      },
                      { label: 'Medio',   col: null             },
                      { label: 'Total',   col: null             },
                      { label: 'Estado',  col: 'estado'         },
                      { label: '',        col: null             },
                    ] as { label: string; col: string | null }[]).map(({ label, col }) => (
                      <th key={label} className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        {col ? (
                          <button
                            onClick={() => toggleSort(col as typeof sortCol)}
                            className="flex items-center gap-1 hover:text-zinc-600 transition-colors"
                          >
                            {label}
                            <span className="text-[8px]">
                              {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                            </span>
                          </button>
                        ) : label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.map(v => (
                    <tr key={v.id} className={`border-b last:border-0 transition-colors ${
                      v.estado === 'anulada' ? 'opacity-40' : ''
                    } ${
                      v.numero_factura
                        ? 'bg-blue-50/60 border-blue-100 hover:bg-blue-50'
                        : 'border-zinc-50 hover:bg-zinc-50/60'
                    }`}>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">#{v.id}</td>
                      <td className="px-4 py-3 text-zinc-600 tabular-nums text-xs">
                        {new Date(v.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        {v.numero_factura ? (
                          <button
                            onClick={() => setFiltroFactura(v.numero_factura!)}
                            className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-mono text-xs px-2 py-0.5 rounded-md transition-colors font-semibold"
                          >
                            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2H5L1 6v6h8V2z"/><line x1="5" y1="2" x2="5" y2="6"/></svg>
                            {v.numero_factura}
                          </button>
                        ) : <span className="text-[10px] font-mono bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded">N{String(v.id).padStart(4, '0')}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.tipo_pago === 'contado' ? 'bg-zinc-100 text-zinc-600' : 'bg-blue-50 text-blue-600'}`}>
                          {v.tipo_pago}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {v.medio_pago ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${MEDIO_COLOR[v.medio_pago] ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {MEDIO_LABEL[v.medio_pago] ?? v.medio_pago}
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
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => verDetalle(v.id)} className="text-zinc-400 hover:text-zinc-800 text-xs transition-colors">
                          Ver
                        </button>
                        {v.estado === 'confirmada' && v.tipo_comprobante !== 'devolucion' && (
                          <button
                            onClick={() => setDevolucionVenta(v)}
                            className="text-amber-500 hover:text-amber-700 text-xs transition-colors"
                          >
                            Devolución
                          </button>
                        )}
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
                  {ventasFiltradas.length === 0 && (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-zinc-400">Sin resultados para "{filtroFactura}"</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-zinc-100">
              {ventasFiltradas.map(v => (
                <div key={v.id} className={`px-4 py-3 ${v.estado === 'anulada' ? 'opacity-40' : ''} ${v.numero_factura ? 'bg-blue-50/50 border-l-4 border-l-blue-400' : 'border-l-4 border-l-transparent'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-zinc-400 font-mono">#{v.id}</span>
                        <span className="text-xs text-zinc-500 tabular-nums">
                          {new Date(v.fecha).toLocaleDateString('es-CL')}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${v.estado === 'confirmada' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                          {v.estado}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {v.medio_pago && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${MEDIO_COLOR[v.medio_pago] ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {MEDIO_LABEL[v.medio_pago] ?? v.medio_pago}
                          </span>
                        )}
                        {v.numero_factura ? (
                          <button
                            onClick={() => setFiltroFactura(v.numero_factura!)}
                            className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-mono text-[10px] px-2 py-0.5 rounded-md transition-colors font-semibold"
                          >
                            <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1H4L1 4v5h7V1z"/><line x1="4" y1="1" x2="4" y2="4"/></svg>
                            {v.numero_factura}
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded">N{String(v.id).padStart(4, '0')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold tabular-nums" style={{ color: 'var(--brand-purple)' }}>{fmt(v.total)}</p>
                      <div className="flex gap-2 mt-1 justify-end">
                        <button onClick={() => verDetalle(v.id)} className="text-xs text-zinc-400 hover:text-zinc-700">Ver</button>
                        {v.estado === 'confirmada' && v.tipo_comprobante !== 'devolucion' && (
                          <button onClick={() => setDevolucionVenta(v)} className="text-xs text-amber-500 hover:text-amber-700">Dev.</button>
                        )}
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
          );
        })()}
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
                ['Medio',     (detalle.medio_pago ? (MEDIO_LABEL[detalle.medio_pago] ?? detalle.medio_pago) : '—')],
                ['Estado',    detalle.estado],
                ['Moneda',    detalle.moneda],
              ].map(([k, v]) => (
                <div key={k} className="bg-zinc-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-zinc-800 font-semibold">{v}</p>
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

            {detalle.observacion && (
              <div className="bg-zinc-50 rounded-xl px-4 py-3 text-xs text-zinc-600">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-1">Observación</p>
                {detalle.observacion}
              </div>
            )}

            {detalle.kitfe_id && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-xs text-emerald-700 flex items-center gap-2">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 6 5 10 11 2"/></svg>
                Sincronizado con Kitfe · ID: {detalle.kitfe_id}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* SICFE Import Modal */}
      {sicfeOpen && (
        <SICFEImportModal onClose={() => setSicfeOpen(false)} onDone={() => { setSicfeOpen(false); load(); }} />
      )}

      {/* Devolución Modal */}
      {devolucionVenta && (
        <DevolucionModal
          venta={devolucionVenta}
          onClose={() => setDevolucionVenta(null)}
          onDone={() => { setDevolucionVenta(null); load(); }}
          onIniciarCanje={(amt, medio) => { setDevolucionVenta(null); load(); onIniciarCanje(amt, medio); }}
        />
      )}
    </div>
  );
}

// ─── SICFE Import Modal ───────────────────────────────────────────────────────

interface SicfeRow {
  fecha: string;
  tipo_comprobante: string;
  receptor_nombre: string;
  total: string;
  medio_pago: string;
}

function SICFEImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rows,         setRows]         = useState<SicfeRow[]>([]);
  const [nroFactura,   setNroFactura]   = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [imported,     setImported]     = useState<number | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const parsed: SicfeRow[] = [];
      for (const line of lines) {
        const parts = line.split(/[,;]/).map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length < 2) continue;
        // Skip header rows (first column is not date-like)
        if (!/^\d{4}-\d{2}-\d{2}/.test(parts[0]) && !/^\d{2}\/\d{2}\/\d{4}/.test(parts[0])) continue;
        let fecha = parts[0];
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
          const [d, m, y] = fecha.split('/');
          fecha = `${y}-${m}-${d}`;
        }
        parsed.push({
          fecha,
          tipo_comprobante: parts[1] ?? 'e-Ticket',
          receptor_nombre:  parts[2] ?? '',
          total:            parts[3] ?? '0',
          medio_pago:       parts[4] ?? 'efectivo',
        });
      }
      if (parsed.length === 0) {
        setError('No se encontraron filas válidas. Formato: fecha, tipo, receptor, total, medio_pago');
      } else {
        setError('');
        setRows(parsed);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const confirmar = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const ventas = rows.map(r => ({
        fecha:            r.fecha,
        tipo_comprobante: r.tipo_comprobante,
        receptor_nombre:  r.receptor_nombre || undefined,
        total:            parseFloat(r.total.replace(/\./g, '').replace(',', '.')),
        medio_pago:       r.medio_pago || 'efectivo',
        numero_factura:   nroFactura || undefined,
      }));
      const res = await api.post<{ importadas: number }>('/ventas/importar-sicfe', { ventas });
      setImported(res.importadas);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Importar desde SICFE" size="lg">
      <div className="space-y-4">
        {imported !== null ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-lg font-semibold text-zinc-800">{imported} ventas importadas</p>
            <p className="text-sm text-zinc-400 mt-1">Sin deducción de stock</p>
            <button onClick={onDone} className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--brand-teal)' }}>
              Listo
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-500">
              Archivo CSV con columnas: <strong>fecha, tipo_comprobante, receptor, total, medio_pago</strong><br />
              Formatos de fecha: <code className="bg-zinc-100 px-1 rounded">YYYY-MM-DD</code> o <code className="bg-zinc-100 px-1 rounded">DD/MM/YYYY</code>. Separador: coma o punto y coma.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Número de factura (opcional)</label>
              <input
                type="text"
                value={nroFactura}
                onChange={e => setNroFactura(e.target.value)}
                placeholder="Ej: 000123 — dejá vacío si no aplica"
                className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-[var(--brand-purple)] transition-colors"
              />
            </div>

            <label className="flex flex-col items-center gap-2 border-2 border-dashed border-zinc-200 rounded-xl p-6 cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span className="text-sm text-zinc-500">{rows.length > 0 ? `${rows.length} filas cargadas — clic para cambiar` : 'Seleccionar archivo CSV'}</span>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </label>

            {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-2.5 rounded-xl">{error}</div>}

            {rows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-zinc-100 max-h-56">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      {['Fecha', 'Tipo', 'Receptor', 'Total', 'Medio'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b border-zinc-50 last:border-0">
                        <td className="px-3 py-2 tabular-nums">{r.fecha}</td>
                        <td className="px-3 py-2">{r.tipo_comprobante}</td>
                        <td className="px-3 py-2 max-w-[100px] truncate">{r.receptor_nombre || '—'}</td>
                        <td className="px-3 py-2 tabular-nums font-semibold">{r.total}</td>
                        <td className="px-3 py-2">{r.medio_pago}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancelar</button>
              <button
                onClick={confirmar}
                disabled={rows.length === 0 || loading}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-40"
                style={{ background: 'var(--brand-purple)' }}
              >
                {loading ? 'Importando…' : `Importar ${rows.length} ventas`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Devolución Modal ─────────────────────────────────────────────────────────

interface DevolucionLinea {
  producto_id: number;
  nombre: string;
  cantidadMax: number;
  cantidad: string;
  precio_unitario: number;
}

function DevolucionModal({ venta, onClose, onDone, onIniciarCanje }: {
  venta: Venta;
  onClose: () => void;
  onDone: () => void;
  onIniciarCanje: (amt: number, medio?: string) => void;
}) {
  const [lineas,  setLineas]  = useState<DevolucionLinea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [remito,  setRemito]  = useState<{ total_devuelto: number; devolucion_id: number } | null>(null);

  useEffect(() => {
    api.get<Venta>(`/ventas/${venta.id}`).then(v => {
      setLineas((v.detalles ?? []).map(d => ({
        producto_id:     d.producto_id,
        nombre:          d.producto?.nombre ?? `Producto #${d.producto_id}`,
        cantidadMax:     d.cantidad,
        cantidad:        '0',
        precio_unitario: d.precio_unitario,
      })));
    });
  }, [venta.id]);

  const updateCantidad = (idx: number, val: string) =>
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, cantidad: val } : l));

  const totalDevuelto = lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0) * l.precio_unitario, 0);

  const confirmar = async () => {
    const detalles = lineas
      .filter(l => (parseFloat(l.cantidad) || 0) > 0)
      .map(l => ({ producto_id: l.producto_id, cantidad: parseFloat(l.cantidad) }));

    if (detalles.length === 0) { setError('Ingresá al menos una cantidad a devolver.'); return; }

    for (const l of lineas) {
      if ((parseFloat(l.cantidad) || 0) > l.cantidadMax) {
        setError(`No podés devolver más de ${l.cantidadMax} de "${l.nombre}".`);
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ total_devuelto: number; devolucion_id: number }>(`/ventas/${venta.id}/devolucion`, { detalles });
      setRemito(res);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al procesar devolución');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Devolución — Venta #${venta.id}`} size="lg">
      <div className="space-y-4">
        {remito ? (
          <div className="space-y-4">
            {/* Remito */}
            <div className="bg-zinc-50 rounded-xl p-5 font-mono text-xs space-y-2 border border-zinc-100">
              <p className="font-bold text-sm text-zinc-800 text-center">REMITO DE DEVOLUCIÓN</p>
              <p className="text-center text-zinc-400">#{remito.devolucion_id} · {new Date().toLocaleDateString('es-CL')}</p>
              <div className="border-t border-dashed border-zinc-300 pt-2 mt-2 space-y-1">
                {lineas.filter(l => (parseFloat(l.cantidad) || 0) > 0).map(l => (
                  <div key={l.producto_id} className="flex justify-between text-zinc-700">
                    <span>{l.nombre}</span>
                    <span>{parseFloat(l.cantidad)} × {fmt(l.precio_unitario)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-zinc-300 pt-2 flex justify-between font-bold text-zinc-900">
                <span>TOTAL DEVUELTO</span>
                <span>{fmt(remito.total_devuelto)}</span>
              </div>
              <p className="text-center text-zinc-400 pt-1">Mercadería reintegrada al stock</p>
            </div>

            {/* Opciones de devolución según medio de pago */}
            {(() => {
              const esEfectivo = venta.medio_pago === 'efectivo';
              const esCombinado = !!(venta.medios_pago && venta.medios_pago.length > 1);
              const esTarjeta = !esEfectivo && !esCombinado;
              return (
                <div className="space-y-2">
                  {/* Efectivo puro → solo reembolso */}
                  {esEfectivo && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5 space-y-1">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="4" width="14" height="9" rx="1.5"/><circle cx="8" cy="8.5" r="2"/>
                        </svg>
                        <p className="text-sm font-semibold text-emerald-800">Devolución en efectivo</p>
                      </div>
                      <p className="text-xs text-emerald-700">
                        Devolver al cliente: <strong className="text-base">{fmt(remito.total_devuelto)}</strong>
                      </p>
                    </div>
                  )}

                  {/* Tarjeta → solo canje */}
                  {esTarjeta && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-1"/>
                        </svg>
                        <p className="text-sm font-semibold text-amber-800">Canje por mercadería</p>
                      </div>
                      <p className="text-xs text-amber-700">
                        La venta fue cobrada con <strong>{venta.medio_pago?.toUpperCase()}</strong>. El crédito de <strong>{fmt(remito.total_devuelto)}</strong> se aplica a la próxima compra con el mismo medio de pago.
                      </p>
                    </div>
                  )}

                  {/* Combinado → elegir */}
                  {esCombinado && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 space-y-2">
                      <p className="text-xs font-semibold text-zinc-600">Pago original combinado — elegí cómo devolver {fmt(remito.total_devuelto)}:</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {(esEfectivo || esCombinado) && (
                      <button
                        onClick={onDone}
                        className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 flex items-center justify-center gap-1.5"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="4" width="14" height="9" rx="1.5"/><circle cx="8" cy="8.5" r="2"/>
                        </svg>
                        Reembolso efectivo
                      </button>
                    )}
                    {(esTarjeta || esCombinado) && (
                      <button
                        onClick={() => onIniciarCanje(remito.total_devuelto, venta.medio_pago ?? 'efectivo')}
                        className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white flex items-center justify-center gap-1.5"
                        style={{ background: 'var(--brand-teal)' }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-1"/>
                        </svg>
                        Iniciar canje · {venta.medio_pago?.toUpperCase()}
                      </button>
                    )}
                    {esEfectivo && (
                      <button
                        onClick={() => onIniciarCanje(remito.total_devuelto, 'efectivo')}
                        className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white flex items-center justify-center gap-1.5"
                        style={{ background: 'var(--brand-purple)' }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        Canjear por mercadería
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : lineas.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400">Cargando detalles…</div>
        ) : (
          <>
            <p className="text-xs text-zinc-400">Ingresá la cantidad a devolver por producto (0 = sin devolución).</p>
            <div className="space-y-2">
              {lineas.map((l, idx) => (
                <div key={l.producto_id} className="flex items-center gap-3 bg-zinc-50 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{l.nombre}</p>
                    <p className="text-xs text-zinc-400">{fmt(l.precio_unitario)} · máx {l.cantidadMax}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateCantidad(idx, String(Math.max(0, (parseFloat(l.cantidad) || 0) - 1)))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 hover:bg-zinc-300 font-bold text-base leading-none"
                    >−</button>
                    <input
                      type="number"
                      min={0}
                      max={l.cantidadMax}
                      step={0.001}
                      value={l.cantidad}
                      onChange={e => updateCantidad(idx, e.target.value)}
                      className="w-16 text-center text-sm border border-zinc-200 rounded-lg py-1.5 focus:outline-none focus:border-violet-400 tabular-nums bg-white"
                    />
                    <button
                      onClick={() => updateCantidad(idx, String(Math.min(l.cantidadMax, (parseFloat(l.cantidad) || 0) + 1)))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 hover:bg-zinc-300 font-bold text-base leading-none"
                    >+</button>
                    <button
                      onClick={() => updateCantidad(idx, String(l.cantidadMax))}
                      className="text-[9px] text-violet-600 border border-violet-200 rounded-lg px-2 py-1.5 hover:bg-violet-50 whitespace-nowrap"
                    >Todo</button>
                  </div>
                </div>
              ))}
            </div>

            {totalDevuelto > 0 && (
              <div className="flex justify-between items-center bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                <span className="text-xs font-semibold text-amber-700">Total a devolver</span>
                <span className="text-base font-bold text-amber-700 tabular-nums">{fmt(totalDevuelto)}</span>
              </div>
            )}

            {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-2.5 rounded-xl">{error}</div>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancelar</button>
              <button
                onClick={confirmar}
                disabled={loading || totalDevuelto === 0}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-40"
                style={{ background: '#f59e0b' }}
              >
                {loading ? 'Procesando…' : `Devolver ${fmt(totalDevuelto)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
