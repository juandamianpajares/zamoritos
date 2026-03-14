'use client';

import { useEffect, useState } from 'react';
import { api, type Proveedor } from '@/lib/api';
import Modal from '@/components/Modal';

const emptyForm = { nombre: '', rut: '', telefono: '', email: '', direccion: '', contacto: '' };

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    const params = search ? `?search=${search}` : '';
    api.get<Proveedor[]>(`/proveedores${params}`).then(data => { setProveedores(data); setLoading(false); });
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setError(''); setModalOpen(true); };

  const openEdit = (p: Proveedor) => {
    setEditId(p.id);
    setForm({ nombre: p.nombre, rut: p.rut ?? '', telefono: p.telefono ?? '',
              email: p.email ?? '', direccion: p.direccion ?? '', contacto: p.contacto ?? '' });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = { ...form, email: form.email || null, rut: form.rut || null };
    try {
      if (editId) { await api.put(`/proveedores/${editId}`, body); }
      else         { await api.post('/proveedores', body); }
      setModalOpen(false);
      load();
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar proveedor?')) return;
    await api.delete(`/proveedores/${id}`);
    load();
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          + Nuevo proveedor
        </button>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre, RUT, email..."
        className="w-full mb-4 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Nombre', 'RUT', 'Teléfono', 'Email', 'Contacto', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proveedores.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{p.rut ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.telefono ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.email ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.contacto ?? '-'}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
              {proveedores.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Sin proveedores</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar proveedor' : 'Nuevo proveedor'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={f('nombre')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
              <input value={form.rut} onChange={f('rut')} placeholder="12.345.678-9"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={f('telefono')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={f('email')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
              <input value={form.contacto} onChange={f('contacto')} placeholder="Nombre del contacto"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input value={form.direccion} onChange={f('direccion')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">Cancelar</button>
            <button type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
