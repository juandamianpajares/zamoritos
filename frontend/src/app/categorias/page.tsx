'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type Categoria } from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

const BASE_STORAGE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace('/api', '/storage');
function catFotoUrl(foto: string) { return `${BASE_STORAGE}/${foto}`; }

const input = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';

const CSV_EJEMPLO = `nombre;parent
ALIMENTOS;
SNACK;
HIGIENE;
PERRO;ALIMENTOS
GATO;ALIMENTOS
CONEJO;ALIMENTOS
AVES;ALIMENTOS
PEZ;ALIMENTOS
RAZA PEQUEÑA;PERRO
RAZA MEDIANA;PERRO
RAZA GRANDE;PERRO
CACHORRO;PERRO
ADULTO;GATO
CASTRADO;GATO`;

type ImportResult = { creadas: number; existentes: number; errores: { fila: number; error: string }[] };

function ImportarModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [archivo,   setArchivo]   = useState<File | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [tab,       setTab]       = useState<'upload' | 'ejemplo'>('upload');
  const inputRef = useRef<HTMLInputElement>(null);

  const importar = async () => {
    if (!archivo) return;
    setLoading(true); setErrorMsg('');
    const fd = new FormData();
    fd.append('archivo', archivo);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
      const res = await fetch(`${apiBase}/categorias/importar`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? 'Error');
      setResultado(data as ImportResult);
    } catch (e: unknown) {
      setErrorMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const descargarEjemplo = () => {
    const blob = new Blob([CSV_EJEMPLO], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'categorias_ejemplo.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen onClose={onClose} title="Importar categorías desde CSV">
      <div className="space-y-4">

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {(['upload', 'ejemplo'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                tab === t ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {t === 'upload' ? 'Subir CSV' : 'Formato y ejemplo'}
            </button>
          ))}
        </div>

        {tab === 'ejemplo' && (
          <div className="space-y-3">
            <div className="bg-zinc-50 rounded-xl p-4 text-xs text-zinc-600 space-y-2">
              <p className="font-semibold text-zinc-800">Formato del CSV (separador <code>;</code>)</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-500">
                <li>Primera fila: cabecera obligatoria <code>nombre;parent</code></li>
                <li><strong>nombre</strong>: nombre de la categoría (en mayúsculas recomendado)</li>
                <li><strong>parent</strong>: nombre de la categoría padre. Vacío = raíz</li>
                <li>Si el padre no existe, se crea automáticamente como raíz</li>
                <li>Nunca duplica — usa <em>firstOrCreate</em></li>
              </ul>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3">
              <pre className="text-[11px] text-emerald-400 leading-relaxed whitespace-pre">{CSV_EJEMPLO}</pre>
            </div>
            <button onClick={descargarEjemplo}
              className="w-full py-2 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
              Descargar plantilla CSV
            </button>
          </div>
        )}

        {tab === 'upload' && !resultado && (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-400 transition-colors"
            >
              {archivo ? (
                <p className="text-sm font-medium text-zinc-700">{archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)</p>
              ) : (
                <div>
                  <p className="text-sm text-zinc-400">Hacé clic para elegir el archivo CSV</p>
                  <p className="text-xs text-zinc-300 mt-0.5">Formato: nombre;parent</p>
                </div>
              )}
            </div>
            <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
          </>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3 py-2 rounded-xl">{errorMsg}</div>
        )}

        {resultado && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{resultado.creadas}</p>
                <p className="text-xs text-emerald-500 mt-0.5">Creadas</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-zinc-500">{resultado.existentes}</p>
                <p className="text-xs text-zinc-400 mt-0.5">Ya existían</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-rose-500">{resultado.errores.length}</p>
                <p className="text-xs text-rose-400 mt-0.5">Errores</p>
              </div>
            </div>
            {resultado.errores.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
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
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
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
              Ver categorías
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function CategoriasPage() {
  const [categorias,   setCategorias]   = useState<Categoria[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [nombre,       setNombre]       = useState('');
  const [parentId,     setParentId]     = useState('');
  const [editId,       setEditId]       = useState<number | null>(null);
  const [editNombre,   setEditNombre]   = useState('');
  const [error,        setError]        = useState('');
  const [importOpen,   setImportOpen]   = useState(false);
  const [toastMsg,     setToastMsg]     = useState('');

  const load = () => {
    setLoading(true);
    api.get<Categoria[]>('/categorias').then(data => { setCategorias(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const raices = categorias.filter(c => !c.parent_id);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/categorias', {
        nombre: nombre.toUpperCase(),
        parent_id: parentId ? Number(parentId) : null,
      });
      setNombre(''); setParentId('');
      load();
      setToastMsg('Categoría creada');
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const handleEdit = async (id: number) => {
    setError('');
    try {
      await api.put(`/categorias/${id}`, { nombre: editNombre.toUpperCase() });
      setEditId(null);
      load();
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar categoría? No se puede si tiene subcategorías o productos.')) return;
    try {
      await api.delete(`/categorias/${id}`);
      load();
    } catch (e: unknown) { alert((e as Error).message); }
  };

  // Agrupar para mostrar jerarquía: raíces primero, hijos indentados
  const ordenadas: (Categoria & { nivel: number })[] = [];
  const agregarConHijos = (lista: Categoria[], parentId: number | null, nivel: number) => {
    lista.filter(c => (c.parent_id ?? null) === parentId).forEach(c => {
      ordenadas.push({ ...c, nivel });
      agregarConHijos(lista, c.id, nivel + 1);
    });
  };
  agregarConHijos(categorias, null, 0);

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      {toastMsg && <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Categorías</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{categorias.length} categorías</p>
        </div>
        <button onClick={() => setImportOpen(true)}
          className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-xl hover:bg-zinc-50 transition-colors">
          ↑ Importar CSV
        </button>
      </div>

      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-zinc-100 p-5 mb-4 space-y-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nueva categoría</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} required
              className={input} placeholder="Ej: RAZA PEQUEÑA" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Subcategoría de (opcional)</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)} className={input}>
              <option value="">— Categoría raíz —</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>
                  {'  '.repeat(c.parent_id ? 1 : 0)}{c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}
        <button type="submit" className="w-full bg-zinc-900 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors">
          Agregar
        </button>
      </form>

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
                <th className="text-left pl-3 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide w-14"></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Nombre</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map(c => (
                <tr key={c.id} className={`border-b border-zinc-50 last:border-0 transition-colors ${
                  c.nivel === 0 ? 'hover:bg-zinc-50/60' : c.nivel === 1 ? 'bg-zinc-50/30 hover:bg-zinc-50/60' : 'bg-zinc-50/60 hover:bg-zinc-100/60'
                }`}>
                  <td className="pl-3 py-2 w-14">
                    {c.nivel === 0 && c.foto ? (
                      <img src={catFotoUrl(c.foto)} alt={c.nombre}
                        className="w-10 h-5 rounded object-cover border border-zinc-100" />
                    ) : (
                      <div className={`rounded ${c.nivel === 0 ? 'w-10 h-5 bg-zinc-100' : ''}`} />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div style={{ paddingLeft: `${c.nivel * 20}px` }} className="flex items-center gap-1.5">
                      {c.nivel > 0 && (
                        <span className="text-zinc-300 text-xs">{'└'}</span>
                      )}
                      {editId === c.id ? (
                        <input value={editNombre} onChange={e => setEditNombre(e.target.value)}
                          className="border border-zinc-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-zinc-500"
                          autoFocus />
                      ) : (
                        <span className={`text-zinc-800 ${c.nivel === 0 ? 'font-medium' : c.nivel === 1 ? 'text-zinc-600' : 'text-zinc-500 text-xs'}`}>
                          {c.nombre}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-3">
                    {editId === c.id ? (
                      <>
                        <button onClick={() => handleEdit(c.id)} className="text-emerald-600 hover:text-emerald-700 text-xs">Guardar</button>
                        <button onClick={() => setEditId(null)} className="text-zinc-400 hover:text-zinc-600 text-xs">Cancelar</button>
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
                <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-zinc-400">Sin categorías — importá un CSV o agregá manualmente</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {importOpen && (
        <ImportarModal
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); load(); setToastMsg(`Importación completada`); }}
        />
      )}
    </div>
  );
}
