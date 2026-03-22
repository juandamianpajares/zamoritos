'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type Producto, type Categoria, type ComboItem } from '@/lib/api';
import Modal from '@/components/Modal';

const BASE_STORAGE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace('/api', '/storage');
function fotoUrl(foto: string) { return `${BASE_STORAGE}/${foto}`; }

function efectivaFoto(p: Producto): string | null {
  if (p.foto_url) return p.foto_url;
  if (p.foto) return fotoUrl(p.foto);
  return null;
}

const emptyForm = {
  nombre: '', codigo_barras: '', marca: '', categoria_id: '',
  unidad_medida: 'unidad', peso: '', precio_venta: '', precio_compra: '', stock: '',
  fraccionable: false, es_combo: false,
  en_promo: false, precio_promo: '', promo_producto_id: '',
  foto_url: '',
};

function calcPrecioVenta(precioCompra: number, pct: number): number {
  return Math.ceil(precioCompra * (1 + pct / 100));
}
function calcPct(precioCompra: number, precioVenta: number): number {
  if (precioCompra <= 0) return 0;
  return Math.round(((precioVenta / precioCompra) - 1) * 10000) / 100; // 2 decimales
}

const unidades = ['unidad', 'kg', 'gramo', 'litro', 'mililitro'];
const input = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';
const label = 'block text-xs font-medium text-zinc-500 mb-1.5';

// ─── Ajuste stock modal ───────────────────────────────────────────────────────
function AjusteStockModal({ producto, onClose, onDone }: { producto: Producto; onClose: () => void; onDone: () => void }) {
  const [cantidad, setCantidad] = useState('');
  const [obs,      setObs]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const confirmar = async () => {
    const qty = parseFloat(cantidad);
    if (!qty || qty === 0) { setError('Ingresá una cantidad (positiva para agregar, negativa para quitar).'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/stock/ajuste', { producto_id: producto.id, cantidad: qty, observacion: obs || undefined });
      onDone();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const nuevoStock = producto.stock + (parseFloat(cantidad) || 0);

  return (
    <Modal isOpen onClose={onClose} title={`Ajuste stock — ${producto.nombre}`}>
      <div className="space-y-4">
        <div className="bg-zinc-50 rounded-xl px-4 py-3 flex justify-between text-sm">
          <span className="text-zinc-500">Stock actual</span>
          <span className="font-semibold text-zinc-800 tabular-nums">{producto.stock} {producto.unidad_medida}</span>
        </div>

        <div>
          <label className={label}>Cantidad a ajustar</label>
          <div className="flex gap-2">
            <button onClick={() => setCantidad(v => String((parseFloat(v) || 0) - 1))}
              className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center text-lg font-bold text-zinc-600 hover:bg-zinc-100">−</button>
            <input
              type="number" step="0.001" value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="Ej: +5 o -2"
              className={`${input} text-center tabular-nums`}
            />
            <button onClick={() => setCantidad(v => String((parseFloat(v) || 0) + 1))}
              className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center text-lg font-bold text-zinc-600 hover:bg-zinc-100">+</button>
          </div>
          {cantidad !== '' && !isNaN(parseFloat(cantidad)) && (
            <p className={`text-xs mt-1.5 font-medium ${nuevoStock < 0 ? 'text-rose-500' : 'text-zinc-500'}`}>
              Nuevo stock: <strong>{nuevoStock.toFixed(2)}</strong> {producto.unidad_medida}
              {nuevoStock < 0 && ' · ⚠ Stock negativo no permitido'}
            </p>
          )}
        </div>

        <div>
          <label className={label}>Observación (opcional)</label>
          <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Ej: conteo físico, merma, etc." className={input} />
        </div>

        {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3 py-2 rounded-xl">{error}</div>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancelar</button>
          <button onClick={confirmar} disabled={loading || nuevoStock < 0}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-40"
            style={{ background: 'var(--brand-teal)' }}>
            {loading ? 'Guardando…' : 'Guardar ajuste'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Importar CSV modal ───────────────────────────────────────────────────────
type ImportResult = { creados: number; actualizados: number; errores: { fila: number; error: string }[]; total_filas: number };

function ImportarCsvModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [archivo,    setArchivo]    = useState<File | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [resultado,  setResultado]  = useState<ImportResult | null>(null);
  const [errorMsg,   setErrorMsg]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const importar = async () => {
    if (!archivo) return;
    setLoading(true); setErrorMsg('');
    const fd = new FormData();
    fd.append('archivo', archivo);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
      const res = await fetch(`${apiBase}/productos/importar`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? 'Error en el servidor');
      setResultado(data as ImportResult);
    } catch (e: unknown) {
      setErrorMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Importar catálogo desde CSV">
      <div className="space-y-4">
        {/* Formato */}
        <div className="bg-zinc-50 rounded-xl p-4 text-xs text-zinc-500 space-y-1.5">
          <p className="font-semibold text-zinc-700">Formato esperado (separador <code>;</code>, primera fila = cabecera):</p>
          <p className="font-mono break-all leading-relaxed text-zinc-400">
            codigo_barras ; nombre ; marca ; categoria ; peso ; unidad_medida ; precio_compra ; precio_venta ; fraccionable ; en_promo ; precio_promo
          </p>
          <ul className="list-disc list-inside space-y-0.5 mt-2">
            <li><strong>nombre</strong>, <strong>precio_venta</strong> y <strong>unidad_medida</strong> son obligatorios.</li>
            <li><strong>fraccionable</strong> / <strong>en_promo</strong>: escribí <code>1</code> para sí, <code>0</code> o vacío para no.</li>
            <li>Si el código de barras ya existe → actualiza el producto.</li>
            <li>Si el código está vacío → crea siempre un producto nuevo.</li>
            <li>Exportá el Excel como <em>CSV UTF-8</em> (en LibreOffice: Guardar como → CSV → separador <code>;</code>).</li>
          </ul>
        </div>

        {/* Selector de archivo */}
        {!resultado && (
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Archivo CSV</label>
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-400 transition-colors"
            >
              {archivo ? (
                <p className="text-sm font-medium text-zinc-700">{archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)</p>
              ) : (
                <p className="text-sm text-zinc-400">Hacé clic para elegir el archivo CSV</p>
              )}
            </div>
            <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3 py-2 rounded-xl">{errorMsg}</div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{resultado.creados}</p>
                <p className="text-xs text-emerald-500 mt-0.5">Creados</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{resultado.actualizados}</p>
                <p className="text-xs text-amber-500 mt-0.5">Actualizados</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{resultado.errores.length}</p>
                <p className="text-xs text-rose-500 mt-0.5">Errores</p>
              </div>
            </div>
            {resultado.errores.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1">
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-xs text-rose-500 bg-rose-50 px-2 py-1 rounded">
                    Fila {e.fila}: {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!resultado ? (
            <button onClick={importar} disabled={!archivo || loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40">
              {loading ? 'Importando…' : 'Importar'}
            </button>
          ) : (
            <button onClick={onDone}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800">
              Ver productos
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductosPage() {
  const [productos,    setProductos]    = useState<Producto[]>([]);
  const [categorias,   setCategorias]   = useState<Categoria[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editId,       setEditId]       = useState<number | null>(null);
  const [form,         setForm]         = useState({ ...emptyForm });
  const [error,        setError]        = useState('');
  const [fotoFile,     setFotoFile]     = useState<File | null>(null);
  const [fotoPreview,  setFotoPreview]  = useState<string | null>(null);
  const [pctGanancia,  setPctGanancia]  = useState<string>('');
  const [ajusteP,      setAjusteP]      = useState<Producto | null>(null);
  const [notifLoading, setNotifLoading] = useState<number | null>(null);
  const [comboItems,   setComboItems]   = useState<{ componente_producto_id: string; cantidad: string }[]>([]);
  const [scanning,     setScanning]     = useState(false);
  const [scanError,    setScanError]    = useState('');
  const [importOpen,   setImportOpen]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (catFilter) params.set('categoria_id', catFilter);
    Promise.all([
      api.get<Producto[]>(`/productos?${params}`),
      api.get<Categoria[]>('/categorias'),
    ]).then(([p, c]) => { setProductos(p); setCategorias(c); setLoading(false); });
  };

  useEffect(() => { load(); }, [search, catFilter]);

  const resetFoto = () => { setFotoFile(null); setFotoPreview(null); };

  const openCreate = () => {
    setEditId(null); setForm({ ...emptyForm }); setError(''); setScanError('');
    setPctGanancia(''); resetFoto(); setComboItems([]); setModalOpen(true);
  };

  const openEdit = (p: Producto) => {
    setEditId(p.id);
    const pc = p.precio_compra ?? 0;
    setForm({
      nombre: p.nombre, codigo_barras: p.codigo_barras ?? '', marca: p.marca ?? '',
      categoria_id: String(p.categoria_id ?? ''), unidad_medida: p.unidad_medida,
      peso: String(p.peso ?? ''), precio_venta: String(p.precio_venta),
      precio_compra: pc > 0 ? String(pc) : '',
      stock: String(p.stock),
      fraccionable: !!p.fraccionable,
      en_promo: !!p.en_promo,
      precio_promo: p.precio_promo != null ? String(p.precio_promo) : '',
      promo_producto_id: p.promo_producto_id != null ? String(p.promo_producto_id) : '',
      foto_url: p.foto_url ?? '',
    });
    setPctGanancia(pc > 0 ? String(calcPct(pc, p.precio_venta)) : '');
    setForm(prev => ({ ...prev, es_combo: !!p.es_combo }));
    setComboItems(
      (p.combo_items ?? []).map(ci => ({
        componente_producto_id: String(ci.componente_producto_id),
        cantidad: String(ci.cantidad),
      }))
    );
    setError('');
    setFotoFile(null);
    setFotoPreview(efectivaFoto(p));
    setModalOpen(true);
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true); setScanError('');
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const res = await fetch('/api/scan-producto', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setForm(prev => ({
        ...prev,
        nombre: data.nombre ?? prev.nombre,
        marca: data.marca ?? prev.marca,
        codigo_barras: data.codigo_barras ?? prev.codigo_barras,
        peso: data.peso != null ? String(data.peso) : prev.peso,
        unidad_medida: data.unidad_medida ?? prev.unidad_medida,
        ...(data.categoria_sugerida
          ? { categoria_id: String(categorias.find(c => c.nombre === data.categoria_sugerida)?.id ?? prev.categoria_id) }
          : {}),
      }));
    } catch (err: unknown) {
      setScanError((err as Error).message);
    } finally {
      setScanning(false);
      if (scanRef.current) scanRef.current.value = '';
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handlePctChange = (val: string) => {
    setPctGanancia(val);
    const pc = parseFloat(form.precio_compra);
    const pct = parseFloat(val);
    if (pc > 0 && !isNaN(pct)) {
      setForm(prev => ({ ...prev, precio_venta: String(calcPrecioVenta(pc, pct)) }));
    }
  };

  const precioVentaCalculado = (() => {
    const pc = parseFloat(form.precio_compra);
    const pct = parseFloat(pctGanancia);
    if (editId && pc > 0 && !isNaN(pct)) return calcPrecioVenta(pc, pct);
    return null;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pvFinal = precioVentaCalculado ?? Number(form.precio_venta);
    const body: Record<string, unknown> = {
      nombre: form.nombre, codigo_barras: form.codigo_barras || null,
      marca: form.marca || null,
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      unidad_medida: form.unidad_medida,
      peso: form.peso ? Number(form.peso) : null,
      precio_venta: pvFinal,
      precio_compra: form.precio_compra ? Number(form.precio_compra) : null,
      stock: form.stock ? Number(form.stock) : undefined,
      fraccionable: form.fraccionable,
      es_combo: form.es_combo,
      en_promo: form.en_promo,
      precio_promo: form.en_promo && form.precio_promo ? Number(form.precio_promo) : null,
      promo_producto_id: form.en_promo && form.promo_producto_id ? Number(form.promo_producto_id) : null,
      foto_url: form.foto_url || null,
    };
    if (form.es_combo) {
      body.combo_items = comboItems
        .filter(ci => ci.componente_producto_id && parseFloat(ci.cantidad) > 0)
        .map(ci => ({ componente_producto_id: Number(ci.componente_producto_id), cantidad: parseFloat(ci.cantidad) }));
    } else {
      body.combo_items = [];
    }
    try {
      let saved: Producto;
      if (editId) { saved = await api.put<Producto>(`/productos/${editId}`, body); }
      else         { saved = await api.post<Producto>('/productos', body); }

      if (fotoFile) {
        const fd = new FormData();
        fd.append('foto', fotoFile);
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'}/productos/${saved.id}/foto`,
          { method: 'POST', headers: { Accept: 'application/json' }, body: fd }
        );
      }
      setModalOpen(false);
      resetFoto();
      load();
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar producto?')) return;
    await api.delete(`/productos/${id}`);
    load();
  };

  const toggleNotificacion = async (p: Producto) => {
    setNotifLoading(p.id);
    try {
      await api.patch(`/productos/${p.id}/notificacion-stock`, {});
      setProductos(prev => prev.map(x => x.id === p.id ? { ...x, notificar_stock_bajo: !x.notificar_stock_bajo } : x));
    } finally {
      setNotifLoading(null);
    }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Productos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{productos.length} registrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)} className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-xl hover:bg-zinc-50 transition-colors">
            ↑ Importar CSV
          </button>
          <button onClick={openCreate} className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
            + Nuevo producto
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5.5" cy="5.5" r="4.5"/><line x1="9" y1="9" x2="13" y2="13"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código, marca o precio..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:border-zinc-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
            </button>
          )}
        </div>
        <select
          value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="w-44 border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-400"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
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
                  {['', 'Código', 'Nombre', 'Marca', 'Categoría', 'P. Venta', 'P. Compra', 'Stock', 'Notif.', ''].map((h, i) => (
                    <th key={i} className="text-left px-3 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productos.map(p => {
                  const img = efectivaFoto(p);
                  return (
                    <tr key={p.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                      <td className="pl-3 py-2 w-12">
                        {img ? (
                          <img src={img} alt={p.nombre}
                            className="w-10 h-10 rounded-lg object-cover border border-zinc-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-300">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="3"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-zinc-400 text-xs font-mono">{p.codigo_barras ?? '—'}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-zinc-800">{p.nombre}</p>
                        {p.en_promo && p.precio_promo != null && (
                          <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full font-medium">
                            Promo x2 · ${Math.round(p.precio_promo!).toLocaleString('es-CL')}
                          </span>
                        )}
                        {p.fraccionado_de && (
                          <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium ml-1">Fraccionado</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-zinc-500">{p.marca ?? '—'}</td>
                      <td className="px-3 py-3">
                        {p.categoria ? (
                          <span className="bg-zinc-100 text-zinc-600 text-xs px-2 py-0.5 rounded-full">{p.categoria.nombre}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 font-medium tabular-nums">${Math.round(p.precio_venta).toLocaleString('es-CL')}</td>
                      <td className="px-3 py-3 text-zinc-500 tabular-nums">
                        {p.precio_compra != null ? `$${Number(p.precio_compra).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <span className={`font-semibold tabular-nums ${p.stock <= 0 ? 'text-rose-600' : p.stock <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                            {p.stock}
                          </span>
                          <span className="text-zinc-400 text-[10px]">{p.unidad_medida}</span>
                          {/* Ajuste stock rápido */}
                          <button
                            onClick={() => setAjusteP(p)}
                            title="Ajustar stock"
                            className="ml-1 w-5 h-5 flex items-center justify-center rounded border border-zinc-200 text-zinc-400 hover:text-zinc-700 hover:border-zinc-400 transition-colors"
                          >
                            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <line x1="5" y1="1" x2="5" y2="9"/><line x1="1" y1="5" x2="9" y2="5"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                      {/* Notificación stock bajo toggle */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleNotificacion(p)}
                          disabled={notifLoading === p.id}
                          title={p.notificar_stock_bajo ? 'Desactivar alerta de stock bajo' : 'Activar alerta de stock bajo'}
                          className={`w-8 h-5 rounded-full transition-colors relative ${
                            p.notificar_stock_bajo ? 'bg-amber-400' : 'bg-zinc-200'
                          } ${notifLoading === p.id ? 'opacity-50' : ''}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            p.notificar_stock_bajo ? 'translate-x-3' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(p)} className="text-zinc-500 hover:text-zinc-800 text-xs mr-3 transition-colors">Editar</button>
                        <button onClick={() => handleDelete(p.id)} className="text-rose-400 hover:text-rose-600 text-xs transition-colors">Eliminar</button>
                      </td>
                    </tr>
                  );
                })}
                {productos.length === 0 && (
                  <tr><td colSpan={10} className="px-6 py-12 text-center text-sm text-zinc-400">Sin productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ajuste stock */}
      {ajusteP && (
        <AjusteStockModal
          producto={ajusteP}
          onClose={() => setAjusteP(null)}
          onDone={() => { setAjusteP(null); load(); }}
        />
      )}

      {/* Modal crear/editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar producto' : 'Nuevo producto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}

          {/* Foto + Escanear */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={label} style={{ margin: 0 }}>Foto del producto</label>
              <button
                type="button"
                onClick={() => scanRef.current?.click()}
                disabled={scanning}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors font-medium"
              >
                {scanning ? (
                  <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-700 rounded-full animate-spin" />
                ) : (
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
                {scanning ? 'Analizando…' : 'Escanear con IA'}
              </button>
            </div>
            {scanError && <p className="text-xs text-rose-500 mb-2">{scanError}</p>}
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 transition-colors overflow-hidden flex items-center justify-center shrink-0"
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-zinc-400">
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-[10px]">Subir foto</span>
                  </div>
                )}
              </button>
              <div className="flex-1 space-y-2">
                <div>
                  <label className={label}>URL de imagen web</label>
                  <input
                    value={form.foto_url}
                    onChange={e => { setForm(p => ({ ...p, foto_url: e.target.value })); if (e.target.value) setFotoPreview(e.target.value); }}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className={input}
                  />
                </div>
                {fotoPreview && (
                  <button
                    type="button"
                    onClick={() => { resetFoto(); setForm(p => ({ ...p, foto_url: '' })); if (fileRef.current) fileRef.current.value = ''; }}
                    className="text-xs text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    Quitar imagen
                  </button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
            <input ref={scanRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={label}>Nombre *</label>
              <input required value={form.nombre} onChange={f('nombre')} className={input} />
            </div>
            <div>
              <label className={label}>Código de barras</label>
              <input value={form.codigo_barras} onChange={f('codigo_barras')} className={input} />
            </div>
            <div>
              <label className={label}>Marca</label>
              <input value={form.marca} onChange={f('marca')} className={input} />
            </div>
            <div>
              <label className={label}>Categoría</label>
              <select value={form.categoria_id} onChange={f('categoria_id')} className={input}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Unidad de medida *</label>
              <select value={form.unidad_medida} onChange={f('unidad_medida')} className={input}>
                {unidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Peso del envase</label>
              <input type="number" step="0.001" min="0" value={form.peso} onChange={f('peso')}
                placeholder="Ej: 22 (kg)" className={input} />
            </div>

            {editId ? (
              /* ── Modo edición: precio_compra read-only + % ganancia → precio_venta ── */
              <>
                <div>
                  <label className={label}>Precio de compra (última compra)</label>
                  <div className={`${input} bg-zinc-50 text-zinc-500 select-none cursor-default`}>
                    {form.precio_compra ? `$${Number(form.precio_compra).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Sin precio de compra'}
                  </div>
                </div>
                <div>
                  <label className={label}>% Ganancia</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="any" min="-100" max="9999" value={pctGanancia}
                      onChange={e => handlePctChange(e.target.value)}
                      placeholder="Ej: 30"
                      className={`${input} w-28`}
                      disabled={!form.precio_compra}
                    />
                    {precioVentaCalculado != null && (
                      <span className="text-sm text-zinc-600">
                        → <strong className="text-zinc-900">${precioVentaCalculado.toLocaleString('es-CL')}</strong>
                      </span>
                    )}
                  </div>
                  {!form.precio_compra && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-zinc-500 mb-1.5">Precio de venta *</label>
                      <input required type="number" step="1" min="0" value={form.precio_venta} onChange={f('precio_venta')} className={input} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── Modo creación: precio_compra libre + % → precio_venta ── */
              <>
                <div>
                  <label className={label}>Precio de compra</label>
                  <input
                    type="number" step="any" min="0" value={form.precio_compra}
                    onChange={e => {
                      const pc = e.target.value;
                      setForm(prev => ({ ...prev, precio_compra: pc }));
                      const pct = parseFloat(pctGanancia);
                      const pcNum = parseFloat(pc);
                      if (pcNum > 0 && !isNaN(pct)) {
                        setForm(prev => ({ ...prev, precio_compra: pc, precio_venta: String(calcPrecioVenta(pcNum, pct)) }));
                      }
                    }}
                    placeholder="Costo de referencia" className={input}
                  />
                </div>
                <div>
                  <label className={label}>% Ganancia</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="any" min="-100" max="9999" value={pctGanancia}
                      onChange={e => handlePctChange(e.target.value)}
                      placeholder="Ej: 30"
                      className={`${input} w-28`}
                      disabled={!form.precio_compra}
                    />
                    {form.precio_compra && pctGanancia !== '' && !isNaN(parseFloat(pctGanancia)) && (
                      <span className="text-sm text-zinc-600">
                        → <strong className="text-zinc-900">${calcPrecioVenta(parseFloat(form.precio_compra), parseFloat(pctGanancia)).toLocaleString('es-CL')}</strong>
                      </span>
                    )}
                  </div>
                  {!form.precio_compra && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-zinc-500 mb-1.5">Precio de venta *</label>
                      <input required type="number" step="1" min="0" value={form.precio_venta} onChange={f('precio_venta')} className={input} />
                    </div>
                  )}
                  {form.precio_compra && (
                    <div className="mt-1.5">
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Precio de venta resultante *</label>
                      <input required type="number" step="1" min="0" value={form.precio_venta} onChange={f('precio_venta')} className={input} />
                    </div>
                  )}
                </div>
              </>
            )}

            {!editId && (
              <div>
                <label className={label}>Stock inicial</label>
                <input type="number" step="0.001" min="0" value={form.stock} onChange={f('stock')} className={input} />
              </div>
            )}
          </div>

          {/* ── Combo ── */}
          <div className="border border-zinc-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-800">Combo de productos</p>
                <p className="text-xs text-zinc-400">Al vender descuenta stock de los productos componentes</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !form.es_combo;
                  setForm(p => ({ ...p, es_combo: next }));
                  if (!next) setComboItems([]);
                }}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.es_combo ? 'bg-violet-500' : 'bg-zinc-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.es_combo ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

            {form.es_combo && (
              <div className="space-y-3">
                {/* Código auto */}
                <p className="text-xs text-zinc-400">
                  Código de barras: se genera automáticamente al elegir el primer componente (<strong>código del 1er producto + C</strong>)
                </p>

                {/* Lista de componentes */}
                {comboItems.map((ci, idx) => {
                  const comp = productos.find(p => p.id === Number(ci.componente_producto_id));
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={ci.componente_producto_id}
                        onChange={e => {
                          const newItems = [...comboItems];
                          newItems[idx] = { ...newItems[idx], componente_producto_id: e.target.value };
                          setComboItems(newItems);
                          // Auto-código si es el primer componente
                          if (idx === 0 && e.target.value) {
                            const p = productos.find(x => x.id === Number(e.target.value));
                            if (p?.codigo_barras && !form.codigo_barras) {
                              setForm(prev => ({ ...prev, codigo_barras: p.codigo_barras + 'C' }));
                            }
                          }
                        }}
                        className={`${input} flex-1`}
                      >
                        <option value="">Seleccionar producto…</option>
                        {productos
                          .filter(p => !p.es_combo)
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}{p.codigo_barras ? ` [${p.codigo_barras}]` : ''} — stock: {p.stock}
                            </option>
                          ))}
                      </select>
                      <input
                        type="number" step="0.001" min="0.001"
                        value={ci.cantidad}
                        onChange={e => {
                          const newItems = [...comboItems];
                          newItems[idx] = { ...newItems[idx], cantidad: e.target.value };
                          setComboItems(newItems);
                        }}
                        placeholder="Cant."
                        className={`${input} w-24`}
                        title={`Unidad: ${comp?.unidad_medida ?? ''}`}
                      />
                      {comp && <span className="text-xs text-zinc-400 whitespace-nowrap">{comp.unidad_medida}</span>}
                      <button
                        type="button"
                        onClick={() => setComboItems(items => items.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-600 text-lg leading-none"
                      >×</button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setComboItems(items => [...items, { componente_producto_id: '', cantidad: '1' }])}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1"
                >
                  <span className="text-base leading-none">+</span> Agregar componente
                </button>

                {/* Código generado */}
                {comboItems.length > 0 && comboItems[0].componente_producto_id && (
                  <div>
                    <label className={label}>Código de barras del combo</label>
                    <input
                      value={form.codigo_barras}
                      onChange={f('codigo_barras')}
                      placeholder="Auto-generado o ingresá manualmente"
                      className={input}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Fraccionable ── */}
          <div className="flex items-center justify-between border border-zinc-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-800">¿Es fraccionable?</p>
              <p className="text-xs text-zinc-400">Permite dividir el producto en unidades menores (ej: bolsa → kg)</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, fraccionable: !p.fraccionable }))}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.fraccionable ? 'bg-amber-500' : 'bg-zinc-200'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.fraccionable ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* ── Combo promocional ── */}
          <div className="border border-zinc-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-800">Combo promocional</p>
                <p className="text-xs text-zinc-400">Precio especial al vender el combo (2 productos)</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, en_promo: !p.en_promo, promo_producto_id: '' }))}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.en_promo ? 'bg-rose-500' : 'bg-zinc-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.en_promo ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            {form.en_promo && (
              <div className="space-y-3">
                {/* Precio del combo */}
                <div>
                  <label className={label}>Precio del combo por unidad</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="1" min="0" value={form.precio_promo} onChange={f('precio_promo')}
                      placeholder="Precio por unidad en el combo"
                      className={`${input} flex-1`}
                    />
                    {form.precio_compra && form.precio_promo && (
                      <span className={`text-xs font-semibold whitespace-nowrap ${
                        Number(form.precio_promo) < Number(form.precio_compra) ? 'text-rose-500' : 'text-emerald-600'
                      }`}>
                        {(Math.round(((Number(form.precio_promo) / Number(form.precio_compra)) - 1) * 10000) / 100).toFixed(2)}% margen
                      </span>
                    )}
                  </div>
                  {form.precio_promo && form.precio_venta && (
                    <p className="text-xs text-zinc-400 mt-1">
                      Descuento vs. precio normal: <strong>{Math.round((1 - Number(form.precio_promo) / Number(form.precio_venta)) * 100)}%</strong>
                      {' · '} Total combo = <strong>${Math.round(2 * Number(form.precio_promo)).toLocaleString('es-CL')}</strong>
                    </p>
                  )}
                </div>

                {/* Segundo producto del combo */}
                <div>
                  <label className={label}>Segundo producto del combo</label>
                  <select
                    value={form.promo_producto_id}
                    onChange={e => setForm(p => ({ ...p, promo_producto_id: e.target.value }))}
                    className={input}
                  >
                    <option value="">Mismo producto × 2</option>
                    {productos
                      .filter(p => p.en_promo && p.id !== editId)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}{p.fraccionable ? ' [fraccionable]' : ''}
                        </option>
                      ))
                    }
                  </select>
                  <p className="text-xs text-zinc-400 mt-1">
                    {form.promo_producto_id
                      ? 'Se agrega 1 unidad de este producto + 1 del seleccionado al precio del combo'
                      : 'Se agregan 2 unidades de este mismo producto al precio del combo'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors">
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal importar CSV ── */}
      {importOpen && (
        <ImportarCsvModal
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); load(); }}
        />
      )}
    </div>
  );
}
