'use client';

import { useEffect, useState } from 'react';
import { api, type Producto, type Categoria } from '@/lib/api';
import Modal from '@/components/Modal';

const emptyForm = {
  nombre: '', codigo_barras: '', marca: '', categoria_id: '',
  unidad_medida: 'unidad', peso: '', precio_venta: '', stock: '',
};

const unidades = ['unidad', 'kg', 'gramo', 'litro', 'mililitro'];

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
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          + Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código, marca..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Código', 'Nombre', 'Marca', 'Categoría', 'Precio', 'Stock', 'Unidad', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.codigo_barras ?? '-'}</td>
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{p.marca ?? '-'}</td>
                  <td className="px-4 py-3">
                    {p.categoria ? (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {p.categoria.nombre}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 font-semibold">${p.precio_venta.toLocaleString('es-CL')}</td>
                  <td className={`px-4 py-3 font-semibold ${p.stock <= 0 ? 'text-red-600' : p.stock <= 5 ? 'text-orange-500' : 'text-green-600'}`}>
                    {p.stock}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.unidad_medida}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Sin productos</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar producto' : 'Nuevo producto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={f('nombre')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras</label>
              <input value={form.codigo_barras} onChange={f('codigo_barras')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input value={form.marca} onChange={f('marca')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={form.categoria_id} onChange={f('categoria_id')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida *</label>
              <select value={form.unidad_medida} onChange={f('unidad_medida')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {unidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso total del envase</label>
              <input type="number" step="0.001" min="0" value={form.peso} onChange={f('peso')}
                placeholder="Ej: 22 (para bolsa 22kg)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta *</label>
              <input required type="number" step="1" min="0" value={form.precio_venta} onChange={f('precio_venta')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {!editId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
                <input type="number" step="0.001" min="0" value={form.stock} onChange={f('stock')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
              Cancelar
            </button>
            <button type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
