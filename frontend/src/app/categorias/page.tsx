'use client';

import { useEffect, useState } from 'react';
import { api, type Categoria } from '@/lib/api';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get<Categoria[]>('/categorias').then(data => { setCategorias(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/categorias', { nombre });
      setNombre('');
      load();
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const handleEdit = async (id: number) => {
    setError('');
    try {
      await api.put(`/categorias/${id}`, { nombre: editNombre });
      setEditId(null);
      load();
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar categoría?')) return;
    try {
      await api.delete(`/categorias/${id}`);
      load();
    } catch (e: unknown) { alert((e as Error).message); }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Categorías</h1>

      {/* Agregar */}
      <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-6 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva categoría</label>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Alimento perros"
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">
          Agregar
        </button>
      </form>

      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    {editId === c.id ? (
                      <input
                        value={editNombre}
                        onChange={e => setEditNombre(e.target.value)}
                        className="border border-blue-400 rounded px-2 py-1 w-full focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      c.nombre
                    )}
                  </td>
                  <td className="px-6 py-3 text-right space-x-2">
                    {editId === c.id ? (
                      <>
                        <button onClick={() => handleEdit(c.id)} className="text-green-600 hover:underline text-xs">Guardar</button>
                        <button onClick={() => setEditId(null)} className="text-gray-500 hover:underline text-xs">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditId(c.id); setEditNombre(c.nombre); }}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Editar
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline text-xs">Eliminar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {categorias.length === 0 && (
                <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-400">Sin categorías</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
