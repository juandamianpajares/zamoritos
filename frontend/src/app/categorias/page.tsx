'use client';

import { useEffect, useState } from 'react';
import { api, type Categoria } from '@/lib/api';

const BASE_STORAGE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace('/api', '/storage');
function catFotoUrl(foto: string) { return `${BASE_STORAGE}/${foto}`; }

const input = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';

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
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Categorías</h1>
        <p className="text-sm text-zinc-400 mt-0.5">{categorias.length} categorías</p>
      </div>

      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-zinc-100 p-5 mb-4 flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nueva categoría</label>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            className={input}
            placeholder="Ej: Alimento perros"
          />
        </div>
        <button type="submit" className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors shrink-0">
          Agregar
        </button>
      </form>

      {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 mb-4">{error}</p>}

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
            Cargando...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide w-14"></th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Nombre</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map(c => (
                <tr key={c.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                  <td className="pl-3 py-2 w-14">
                    {c.foto ? (
                      <img src={catFotoUrl(c.foto)} alt={c.nombre}
                        className="w-10 h-5 rounded object-cover border border-zinc-100" />
                    ) : (
                      <div className="w-10 h-5 rounded bg-zinc-100" />
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editId === c.id ? (
                      <input
                        value={editNombre}
                        onChange={e => setEditNombre(e.target.value)}
                        className="border border-zinc-300 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:border-zinc-500"
                        autoFocus
                      />
                    ) : (
                      <span className="text-zinc-800">{c.nombre}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right space-x-3">
                    {editId === c.id ? (
                      <>
                        <button onClick={() => handleEdit(c.id)} className="text-emerald-600 hover:text-emerald-700 text-xs transition-colors">Guardar</button>
                        <button onClick={() => setEditId(null)} className="text-zinc-400 hover:text-zinc-600 text-xs transition-colors">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditId(c.id); setEditNombre(c.nombre); }}
                          className="text-zinc-500 hover:text-zinc-800 text-xs transition-colors">Editar</button>
                        <button onClick={() => handleDelete(c.id)} className="text-rose-400 hover:text-rose-600 text-xs transition-colors">Eliminar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {categorias.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-zinc-400">Sin categorías</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
