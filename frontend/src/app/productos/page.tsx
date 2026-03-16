'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type Producto, type Categoria } from '@/lib/api';
import Modal from '@/components/Modal';

const BASE_STORAGE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace('/api', '/storage');

function fotoUrl(foto: string) { return `${BASE_STORAGE}/${foto}`; }

const emptyForm = {
  nombre: '', codigo_barras: '', marca: '', categoria_id: '',
  unidad_medida: 'unidad', peso: '', precio_venta: '', precio_compra: '', stock: '',
};

function calcPrecioVenta(precioCompra: number, pct: number): number {
  return Math.ceil(precioCompra * (1 + pct / 100));
}
function calcPct(precioCompra: number, precioVenta: number): number {
  if (precioCompra <= 0) return 0;
  return Math.round(((precioVenta / precioCompra) - 1) * 100);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

const unidades = ['unidad', 'kg', 'gramo', 'litro', 'mililitro'];

const input = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';
const label = 'block text-xs font-medium text-zinc-500 mb-1.5';

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [pctGanancia, setPctGanancia] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
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
    setPctGanancia(''); resetFoto(); setModalOpen(true);
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanError('');
    // Show scanned image as foto preview
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const res = await fetch('/api/scan-producto', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      // Pre-fill form fields
      setForm(prev => ({
        ...prev,
        nombre: data.nombre ?? prev.nombre,
        marca: data.marca ?? prev.marca,
        codigo_barras: data.codigo_barras ?? prev.codigo_barras,
        peso: data.peso != null ? String(data.peso) : prev.peso,
        unidad_medida: data.unidad_medida ?? prev.unidad_medida,
        // Map categoria_sugerida to actual categoria_id
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

  const openEdit = (p: Producto) => {
    setEditId(p.id);
    const pc = p.precio_compra ?? 0;
    setForm({
      nombre: p.nombre, codigo_barras: p.codigo_barras ?? '', marca: p.marca ?? '',
      categoria_id: String(p.categoria_id ?? ''), unidad_medida: p.unidad_medida,
      peso: String(p.peso ?? ''), precio_venta: String(p.precio_venta),
      precio_compra: pc > 0 ? String(pc) : '',
      stock: String(p.stock),
    });
    setPctGanancia(pc > 0 ? String(calcPct(pc, p.precio_venta)) : '');
    setError('');
    setFotoFile(null);
    setFotoPreview(p.foto ? fotoUrl(p.foto) : null);
    setModalOpen(true);
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pvFinal = precioVentaCalculado ?? Number(form.precio_venta);
    const body = {
      nombre: form.nombre, codigo_barras: form.codigo_barras || null,
      marca: form.marca || null,
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      unidad_medida: form.unidad_medida,
      peso: form.peso ? Number(form.peso) : null,
      precio_venta: pvFinal,
      precio_compra: form.precio_compra ? Number(form.precio_compra) : null,
      stock: form.stock ? Number(form.stock) : undefined,
    };
    try {
      let saved: Producto;
      if (editId) { saved = await api.put<Producto>(`/productos/${editId}`, body); }
      else         { saved = await api.post<Producto>('/productos', body); }

      // Subir foto si se seleccionó una
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

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handlePctChange = (val: string) => {
    setPctGanancia(val);
    const pc = parseFloat(form.precio_compra);
    const pct = parseFloat(val);
    if (pc > 0 && !isNaN(pct)) {
      setForm(prev => ({ ...prev, precio_venta: String(calcPrecioVenta(pc, pct)) }));
    }
  };

  // Derived precio_venta for edit mode (when precio_compra + pct are set)
  const precioVentaCalculado = (() => {
    const pc = parseFloat(form.precio_compra);
    const pct = parseFloat(pctGanancia);
    if (editId && pc > 0 && !isNaN(pct)) return calcPrecioVenta(pc, pct);
    return null;
  })();

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Productos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{productos.length} registrados</p>
        </div>
        <button onClick={openCreate} className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
          + Nuevo producto
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código, marca..."
          className={`flex-1 ${input}`}
        />
        <select
          value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className={`w-48 ${input}`}
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
                  {['', 'Código', 'Nombre', 'Marca', 'Categoría', 'P. Venta', 'P. Compra', 'Stock', 'Unidad', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                    <td className="pl-4 py-2">
                      {p.foto ? (
                        <img src={fotoUrl(p.foto)} alt={p.nombre}
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
                    <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{p.codigo_barras ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-zinc-500">{p.marca ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.categoria ? (
                        <span className="bg-zinc-100 text-zinc-600 text-xs px-2 py-0.5 rounded-full">
                          {p.categoria.nombre}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums">${p.precio_venta.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-zinc-500 tabular-nums text-sm">
                      {p.precio_compra != null ? `$${p.precio_compra.toLocaleString('es-CL')}` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={`font-semibold ${p.stock <= 0 ? 'text-rose-600' : p.stock <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{p.unidad_medida}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="text-zinc-500 hover:text-zinc-800 text-xs mr-3 transition-colors">Editar</button>
                      <button onClick={() => handleDelete(p.id)} className="text-rose-400 hover:text-rose-600 text-xs transition-colors">Eliminar</button>
                    </td>
                  </tr>
                ))}
                {productos.length === 0 && (
                  <tr><td colSpan={10} className="px-6 py-12 text-center text-sm text-zinc-400">Sin productos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                {scanning ? 'Analizando…' : 'Escanear producto con IA'}
              </button>
            </div>
            {scanError && <p className="text-xs text-rose-500 mb-2">{scanError}</p>}
            <div className="flex items-center gap-4">
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
              <div className="text-xs text-zinc-400 space-y-1">
                <p>JPG, PNG o WebP · máx. 4 MB</p>
                {fotoPreview && (
                  <button
                    type="button"
                    onClick={() => { resetFoto(); if (fileRef.current) fileRef.current.value = ''; }}
                    className="text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    Quitar foto
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
                  <label className={label}>Precio de compra (de última compra)</label>
                  <div className={`${input} bg-zinc-50 text-zinc-500 select-none cursor-default`}>
                    {form.precio_compra ? `$${Number(form.precio_compra).toLocaleString('es-CL')}` : 'Sin precio de compra registrado'}
                  </div>
                </div>
                <div>
                  <label className={label}>% Ganancia</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="9999"
                      value={pctGanancia}
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
                    {!form.precio_compra && (
                      <span className="text-xs text-zinc-400">Cargá un precio de compra primero</span>
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
              /* ── Modo creación: ambos campos libres ── */
              <>
                <div>
                  <label className={label}>Precio de compra</label>
                  <input type="number" step="1" min="0" value={form.precio_compra}
                    onChange={e => { f('precio_compra')(e); }}
                    placeholder="Costo de referencia" className={input} />
                </div>
                <div>
                  <label className={label}>Precio de venta *</label>
                  <input required type="number" step="1" min="0" value={form.precio_venta} onChange={f('precio_venta')} className={input} />
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
    </div>
  );
}
