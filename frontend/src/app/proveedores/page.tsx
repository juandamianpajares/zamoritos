'use client';

import { useEffect, useState } from 'react';
import { api, type Proveedor, type Compra } from '@/lib/api';
import Modal from '@/components/Modal';

const emptyForm = { nombre: '', rut: '', telefono: '', email: '', direccion: '', contacto: '', notas: '' };

const input = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';
const label = 'block text-xs font-medium text-zinc-500 mb-1.5';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [comprasProveedor, setComprasProveedor] = useState<Compra[]>([]);

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
              email: p.email ?? '', direccion: p.direccion ?? '', contacto: p.contacto ?? '',
              notas: p.notas ?? '' });
    setError('');
    setComprasProveedor([]);
    api.get<Compra[]>(`/compras?proveedor_id=${p.id}`)
      .then(cs => setComprasProveedor(cs.sort((a, b) => b.fecha.localeCompare(a.fecha))))
      .catch(() => {});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = { ...form, email: form.email || null, rut: form.rut || null, notas: form.notas || null };
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

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="p-6 lg:p-8 max-w-6xl overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Proveedores</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{proveedores.length} registrados</p>
        </div>
        <button onClick={openCreate} className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
          + Nuevo proveedor
        </button>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre, RUT, email..."
        className={`w-full mb-4 ${input}`}
      />

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
                  {['Nombre', 'RUT', 'Teléfono', 'Email', 'Contacto', 'Notas', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proveedores.map(p => (
                  <tr key={p.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{p.rut ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">{p.telefono ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">{p.email ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">{p.contacto ?? '—'}</td>
                    <td className="px-4 py-3 max-w-xs">
                      {p.notas ? (
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{p.notas}</p>
                      ) : <span className="text-zinc-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="text-zinc-500 hover:text-zinc-800 text-xs mr-3 transition-colors">Editar</button>
                      <button onClick={() => handleDelete(p.id)} className="text-rose-400 hover:text-rose-600 text-xs transition-colors">Eliminar</button>
                    </td>
                  </tr>
                ))}
                {proveedores.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-zinc-400">Sin proveedores</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar proveedor' : 'Nuevo proveedor'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={label}>Nombre *</label>
              <input required value={form.nombre} onChange={f('nombre')} className={input} />
            </div>
            <div>
              <label className={label}>RUT</label>
              <input value={form.rut} onChange={f('rut')} placeholder="12.345.678-9" className={input} />
            </div>
            <div>
              <label className={label}>Teléfono</label>
              <input value={form.telefono} onChange={f('telefono')} className={input} />
            </div>
            <div>
              <label className={label}>Email</label>
              <input type="email" value={form.email} onChange={f('email')} className={input} />
            </div>
            <div>
              <label className={label}>Contacto</label>
              <input value={form.contacto} onChange={f('contacto')} placeholder="Nombre del contacto" className={input} />
            </div>
            <div className="col-span-2">
              <label className={label}>Dirección</label>
              <input value={form.direccion} onChange={f('direccion')} className={input} />
            </div>
            <div className="col-span-2">
              <label className={label}>Notas / Memo</label>
              <textarea
                value={form.notas}
                onChange={f('notas')}
                rows={4}
                placeholder="Condiciones de entrega, precios acordados, observaciones sobre pedidos..."
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400 resize-none leading-relaxed"
              />
            </div>
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

        {/* Historial de pedidos con notas */}
        {editId && comprasProveedor.length > 0 && (
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Historial de pedidos</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comprasProveedor.map(c => (
                <div key={c.id} className="rounded-xl border border-zinc-100 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400 tabular-nums">
                      {new Date(c.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      {c.factura && <span className="ml-2 font-mono text-zinc-300">#{c.factura}</span>}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-800">
                      ${c.total.toLocaleString('es-CL')}
                    </span>
                  </div>
                  {c.nota && (
                    <p className="text-xs text-zinc-500 leading-relaxed bg-zinc-50 rounded-lg px-3 py-2 mt-1">{c.nota}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
