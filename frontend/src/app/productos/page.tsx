'use client';

import { useEffect, useState } from 'react';
import { api, type Producto, type Categoria } from '@/lib/api';
import Modal from '@/components/Modal';

const emptyForm = {
  nombre: '', codigo_barras: '', marca: '', categoria_id: '',
  unidad_medida: 'unidad', peso: '', precio_venta: '', stock: '',
};

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

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setError(''); setModalOpen(true); };

  const openEdit = (p: Producto) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre, codigo_barras: p.codigo_barras ?? '', marca: p.marca ?? '',
      categoria_id: String(p.categoria_id ?? ''), unidad_medida: p.unidad_medida,
      peso: String(p.peso ?? ''), precio_venta: String(p.precio_venta), stock: String(p.stock),
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = {
      nombre: form.nombre, codigo_barras: form.codigo_barras || null,
      marca: form.marca || null,
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      unidad_medida: form.unidad_medida,
      peso: form.peso ? Number(form.peso) : null,
      precio_venta: Number(form.precio_venta),
      stock: form.stock ? Number(form.stock) : undefined,
    };
    try {
      if (editId) { await api.put(`/productos/${editId}`, body); }
      else         { await api.post('/productos', body); }
      setModalOpen(false);
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
                  {['Código', 'Nombre', 'Marca', 'Categoría', 'Precio', 'Stock', 'Unidad', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
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
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-zinc-400">Sin productos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar producto' : 'Nuevo producto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}

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
            <div>
              <label className={label}>Precio de venta *</label>
              <input required type="number" step="1" min="0" value={form.precio_venta} onChange={f('precio_venta')} className={input} />
            </div>
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
