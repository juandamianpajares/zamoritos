'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { api, type Categoria, type Producto } from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

const BASE_URL    = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';
const BASE_STORAGE = BASE_URL.replace('/api', '/storage');
function fotoUrl(f: string) { return `${BASE_STORAGE}/${f}`; }

const inp = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';

// ─── Paleta de colores idéntica a ventas ──────────────────────────────────────
function getCatColor(nombre: string): { bg: string; text: string; dot: string } {
  const n = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('perro') || n.includes('canino'))  return { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-400' };
  if (n.includes('gato')  || n.includes('felino'))  return { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-400' };
  if (n.includes('conejo'))                          return { bg: 'bg-pink-100',   text: 'text-pink-600',   dot: 'bg-pink-400'   };
  if (n.includes('pez')   || n.includes('acuario')) return { bg: 'bg-cyan-100',   text: 'text-cyan-700',   dot: 'bg-cyan-400'   };
  if (n.includes('aves')  || n.includes('ave') || n.includes('gallina') || n.includes('pollo'))
    return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' };
  if (n.includes('caballo') || n.includes('equino')) return { bg: 'bg-lime-100',   text: 'text-lime-700',   dot: 'bg-lime-400'   };
  if (n.includes('alimento') || n.includes('comida'))return { bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-400'};
  if (n.includes('snack'))   return { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400'  };
  if (n.includes('higiene')) return { bg: 'bg-sky-100',    text: 'text-sky-600',    dot: 'bg-sky-400'    };
  if (n.includes('estetica'))return { bg: 'bg-fuchsia-100',text: 'text-fuchsia-600',dot: 'bg-fuchsia-400'};
  if (n.includes('limpieza'))return { bg: 'bg-blue-100',   text: 'text-blue-600',   dot: 'bg-blue-400'   };
  if (n.includes('veneno')) return { bg: 'bg-red-100',    text: 'text-red-600',    dot: 'bg-red-400'    };
  if (n.includes('paseo'))  return { bg: 'bg-green-100',  text: 'text-green-600',  dot: 'bg-green-400'  };
  if (n.includes('ropa'))   return { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-400' };
  return { bg: 'bg-zinc-100', text: 'text-zinc-600', dot: 'bg-zinc-400' };
}

// ─── Nodo de árbol recursivo ──────────────────────────────────────────────────
function TreeNode({
  cat, nivel, seleccionada, abiertos, onSelect, onToggle,
}: {
  cat: Categoria; nivel: number;
  seleccionada: number | null;
  abiertos: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
}) {
  const tieneHijos = (cat.children ?? []).length > 0;
  const abierto    = abiertos.has(cat.id);
  const activo     = seleccionada === cat.id;
  const color      = getCatColor(cat.nombre);

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl cursor-pointer select-none transition-all group
          ${activo ? `${color.bg} ${color.text} font-semibold` : 'hover:bg-zinc-50 text-zinc-700'}`}
        style={{ paddingLeft: `${8 + nivel * 18}px` }}
        onClick={() => onSelect(cat.id)}
      >
        {tieneHijos ? (
          <button
            onClick={e => { e.stopPropagation(); onToggle(cat.id); }}
            className={`w-4 h-4 flex items-center justify-center rounded transition-transform shrink-0 ${abierto ? 'rotate-90' : ''}`}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
              <path d="M2 1l4 3-4 3V1z"/>
            </svg>
          </button>
        ) : (
          <span className={`w-4 h-4 flex items-center justify-center shrink-0`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activo ? color.dot : 'bg-zinc-300'}`} />
          </span>
        )}
        <span className={`text-xs truncate ${nivel === 0 ? 'font-semibold' : ''}`}>{cat.nombre}</span>
        {tieneHijos && (
          <span className="ml-auto text-[10px] text-zinc-400 shrink-0">{(cat.children ?? []).length}</span>
        )}
      </div>

      {tieneHijos && abierto && (
        <div>
          {(cat.children ?? []).map(hijo => (
            <TreeNode key={hijo.id} cat={hijo} nivel={nivel + 1}
              seleccionada={seleccionada} abiertos={abiertos}
              onSelect={onSelect} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal importar CSV ───────────────────────────────────────────────────────
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
CACHORRO;PERRO
ADULTO;GATO
CASTRADO;GATO
CABALLO;
PONEDORA;AVES`;

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
      const res = await fetch(`${BASE_URL}/categorias/importar`, {
        method: 'POST', headers: { Accept: 'application/json' }, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? 'Error');
      setResultado(data as ImportResult);
    } catch (e: unknown) { setErrorMsg((e as Error).message); }
    finally { setLoading(false); }
  };

  const descargar = () => {
    const blob = new Blob([CSV_EJEMPLO], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'categorias.csv' });
    a.click();
  };

  return (
    <Modal isOpen onClose={onClose} title="Importar categorías desde CSV">
      <div className="space-y-4">
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {(['upload', 'ejemplo'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === t ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}>
              {t === 'upload' ? 'Subir CSV' : 'Formato y plantilla'}
            </button>
          ))}
        </div>

        {tab === 'ejemplo' && (
          <div className="space-y-3">
            <div className="bg-zinc-50 rounded-xl p-4 text-xs text-zinc-500 space-y-1.5">
              <p className="font-semibold text-zinc-700">Formato: <code>nombre;parent</code></p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><strong>parent</strong> vacío → categoría raíz</li>
                <li><strong>parent</strong> con valor → subcategoría del padre indicado</li>
                <li>Si el padre no existe, se crea automáticamente</li>
                <li>Nunca duplica (usa firstOrCreate)</li>
              </ul>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3">
              <pre className="text-[11px] text-emerald-400 leading-relaxed whitespace-pre">{CSV_EJEMPLO}</pre>
            </div>
            <button onClick={descargar} className="w-full py-2 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              Descargar plantilla
            </button>
          </div>
        )}

        {tab === 'upload' && !resultado && (
          <>
            <div onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-400 transition-colors">
              {archivo
                ? <p className="text-sm font-medium text-zinc-700">{archivo.name}</p>
                : <p className="text-sm text-zinc-400">Clic para elegir CSV</p>}
            </div>
            <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
          </>
        )}

        {errorMsg && <div className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{errorMsg}</div>}

        {resultado && (
          <div className="grid grid-cols-3 gap-3">
            {[['Creadas', resultado.creadas, 'emerald'], ['Existentes', resultado.existentes, 'zinc'], ['Errores', resultado.errores.length, 'rose']].map(([l, v, c]) => (
              <div key={String(l)} className={`bg-${c}-50 rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-bold text-${c}-600`}>{v}</p>
                <p className={`text-xs text-${c}-500 mt-0.5`}>{l}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!resultado
            ? <button onClick={importar} disabled={!archivo || loading}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-zinc-900 disabled:opacity-40">
                {loading ? 'Importando…' : 'Importar'}
              </button>
            : <button onClick={onDone} className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-zinc-900">
                Ver categorías
              </button>}
        </div>
      </div>
    </Modal>
  );
}

// ─── Panel de detalle de categoría seleccionada ───────────────────────────────
function DetalleCat({
  cat, allCats, onSelectChild,
}: {
  cat: Categoria;
  allCats: Categoria[];
  onSelectChild: (id: number) => void;
}) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<Producto[]>(`/productos?categoria_id=${cat.id}&subtree=1`)
      .then(data => {
        // Top 10 por stock, sin agotados primero
        const sorted = [...data].sort((a, b) => b.stock - a.stock);
        setProductos(sorted.slice(0, 10));
      })
      .finally(() => setLoading(false));
  }, [cat.id]);

  const color    = getCatColor(cat.nombre);
  const hijos    = cat.children ?? [];
  const foto     = cat.foto_url ?? (cat.foto ? fotoUrl(cat.foto) : null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`rounded-2xl p-5 flex items-center gap-4 ${color.bg}`}>
        {foto ? (
          <img src={foto} alt={cat.nombre} className="w-20 h-10 rounded-xl object-cover border border-white/40 shadow" />
        ) : (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${color.text} bg-white/50`}>
            {cat.nombre[0]}
          </div>
        )}
        <div>
          <h2 className={`text-lg font-bold ${color.text}`}>{cat.nombre}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {hijos.length > 0 ? `${hijos.length} subcategoría${hijos.length !== 1 ? 's' : ''}` : 'Categoría hoja'}
            {productos.length > 0 ? ` · ${productos.length === 10 ? 'Top 10 de' : productos.length} producto${productos.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </div>

      {/* Subcategorías */}
      {hijos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Subcategorías</p>
          <div className="flex flex-wrap gap-2">
            {hijos.map(h => {
              const hColor = getCatColor(h.nombre);
              return (
                <button key={h.id} onClick={() => onSelectChild(h.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all hover:shadow-sm ${hColor.bg} ${hColor.text} border-white/60`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hColor.dot}`} />
                  {h.nombre}
                  {(h.children ?? []).length > 0 && (
                    <span className="opacity-60">({(h.children ?? []).length})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 10 productos */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Top 10 por stock — {cat.nombre} {hijos.length > 0 ? '(incluye subcategorías)' : ''}
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400 py-4">
            <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
            Cargando...
          </div>
        ) : productos.length === 0 ? (
          <div className="text-sm text-zinc-400 py-6 text-center bg-zinc-50 rounded-xl">
            Sin productos en esta categoría
          </div>
        ) : (
          <div className="space-y-1.5">
            {productos.map((p, i) => {
              const pct = productos[0]?.stock > 0 ? (p.stock / productos[0].stock) * 100 : 0;
              const stockBajo = p.stock <= 5 && p.stock > 0;
              const agotado   = p.stock <= 0;
              return (
                <div key={p.id} className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl px-3 py-2.5 hover:border-zinc-200 transition-colors">
                  {/* Posición */}
                  <span className={`text-xs font-bold w-5 text-center shrink-0 ${i < 3 ? color.text : 'text-zinc-400'}`}>
                    {i + 1}
                  </span>

                  {/* Foto */}
                  {(p.thumb || p.foto || p.foto_url) ? (
                    <img src={p.foto_url ?? fotoUrl(p.thumb ?? p.foto!)} alt={p.nombre}
                      className="w-8 h-8 rounded-lg object-cover border border-zinc-100 shrink-0" />
                  ) : (
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${color.bg} ${color.text}`}>
                      {p.nombre[0]}
                    </div>
                  )}

                  {/* Nombre + barra */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-medium truncate ${agotado ? 'text-zinc-400' : 'text-zinc-800'}`}>{p.nombre}</p>
                      <span className={`text-xs font-bold tabular-nums shrink-0 ${agotado ? 'text-rose-400' : stockBajo ? 'text-amber-500' : 'text-zinc-700'}`}>
                        {agotado ? 'AGOTADO' : `${p.stock} ${p.unidad_medida}`}
                      </span>
                    </div>
                    {!agotado && (
                      <div className="mt-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${stockBajo ? 'bg-amber-400' : color.dot}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CategoriasPage() {
  const [tree,       setTree]       = useState<Categoria[]>([]);
  const [allCats,    setAllCats]    = useState<Categoria[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selId,      setSelId]      = useState<number | null>(null);
  const [abiertos,   setAbiertos]   = useState<Set<number>>(new Set());
  const [busqueda,   setBusqueda]   = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [toastMsg,   setToastMsg]   = useState('');

  // Form nueva categoría
  const [nombre,   setNombre]   = useState('');
  const [parentId, setParentId] = useState('');
  const [error,    setError]    = useState('');

  const load = async () => {
    setLoading(true);
    const [t, flat] = await Promise.all([
      api.get<Categoria[]>('/categorias/tree'),
      api.get<Categoria[]>('/categorias'),
    ]);
    setTree(t);
    setAllCats(flat);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Abre automáticamente los padres de la categoría seleccionada
  const seleccionarCat = (id: number) => {
    setSelId(id);
    // Encontrar path hasta la raíz y abrir
    const path: number[] = [];
    let current = allCats.find(c => c.id === id);
    while (current?.parent_id) {
      path.push(current.parent_id);
      current = allCats.find(c => c.id === current!.parent_id);
    }
    if (path.length) setAbiertos(prev => new Set([...prev, ...path]));
  };

  const toggleAbierto = (id: number) =>
    setAbiertos(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // Árbol filtrado por búsqueda
  const treeVisible = useMemo(() => {
    if (!busqueda.trim()) return tree;
    const q = busqueda.trim().toLowerCase();
    const matchIds = new Set<number>();
    const addWithAncestors = (cat: Categoria) => {
      if (cat.nombre.toLowerCase().includes(q)) {
        matchIds.add(cat.id);
        let c = allCats.find(x => x.id === cat.parent_id);
        while (c) { matchIds.add(c.id); c = allCats.find(x => x.id === c!.parent_id); }
      }
      (cat.children ?? []).forEach(addWithAncestors);
    };
    tree.forEach(addWithAncestors);
    const filter = (cats: Categoria[]): Categoria[] =>
      cats.filter(c => matchIds.has(c.id)).map(c => ({ ...c, children: filter(c.children ?? []) }));
    return filter(tree);
  }, [tree, allCats, busqueda]);

  // Expandir todo cuando hay búsqueda
  useEffect(() => {
    if (busqueda.trim()) {
      const ids = new Set<number>();
      const collect = (cats: Categoria[]) => cats.forEach(c => { ids.add(c.id); collect(c.children ?? []); });
      collect(tree);
      setAbiertos(ids);
    }
  }, [busqueda, tree]);

  const selCat = allCats.find(c => c.id === selId);
  // Enriquecer con children para el panel detalle
  const findInTree = (cats: Categoria[], id: number): Categoria | undefined => {
    for (const c of cats) {
      if (c.id === id) return c;
      const f = findInTree(c.children ?? [], id);
      if (f) return f;
    }
  };
  const selCatConHijos = selId ? findInTree(tree, selId) : undefined;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/categorias', {
        nombre: nombre.toUpperCase(),
        parent_id: parentId ? Number(parentId) : null,
      });
      setNombre(''); setParentId('');
      await load();
      setToastMsg('Categoría creada');
    } catch (e: unknown) { setError((e as Error).message); }
  };

  return (
    <div className="h-full flex flex-col">
      {toastMsg && <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />}

      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-zinc-100 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Categorías</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{allCats.length} categorías · {tree.length} raíces</p>
        </div>
        <button onClick={() => setImportOpen(true)}
          className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-xl hover:bg-zinc-50 transition-colors">
          ↑ Importar CSV
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Panel izquierdo: árbol ── */}
        <div className="w-64 lg:w-72 shrink-0 border-r border-zinc-100 bg-white flex flex-col">

          {/* Búsqueda */}
          <div className="p-3 border-b border-zinc-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="5" cy="5" r="4"/><line x1="8.5" y1="8.5" x2="11" y2="11"/>
              </svg>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar categoría…"
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-zinc-50 focus:outline-none focus:border-zinc-400 focus:bg-white" />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
                  <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Árbol scrolleable */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading ? (
              <div className="p-4 text-xs text-zinc-400 flex gap-2 items-center">
                <div className="w-3 h-3 border-2 border-zinc-200 border-t-zinc-400 rounded-full animate-spin"/>Cargando…
              </div>
            ) : treeVisible.length === 0 ? (
              <p className="p-4 text-xs text-zinc-400">Sin resultados</p>
            ) : (
              treeVisible.map(cat => (
                <TreeNode key={cat.id} cat={cat} nivel={0}
                  seleccionada={selId} abiertos={abiertos}
                  onSelect={seleccionarCat} onToggle={toggleAbierto} />
              ))
            )}
          </div>

          {/* Agregar nueva */}
          <div className="border-t border-zinc-100 p-3">
            <form onSubmit={handleCreate} className="space-y-2">
              <input value={nombre} onChange={e => setNombre(e.target.value)} required
                placeholder="Nueva categoría…"
                className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 bg-white" />
              <select value={parentId} onChange={e => setParentId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 bg-white">
                <option value="">— Raíz —</option>
                {allCats.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              {error && <p className="text-rose-500 text-xs">{error}</p>}
              <button type="submit"
                className="w-full py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors">
                + Agregar
              </button>
            </form>
          </div>
        </div>

        {/* ── Panel derecho: detalle ── */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50">
          {!selCatConHijos ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-30">
                <path d="M3 7h18M3 12h12M3 17h9"/><rect x="14" y="11" width="10" height="10" rx="2"/>
              </svg>
              <p className="text-sm font-medium">Seleccioná una categoría</p>
              <p className="text-xs mt-1">para ver sus subcategorías y el top 10 por stock</p>
            </div>
          ) : (
            <DetalleCat
              cat={selCatConHijos}
              allCats={allCats}
              onSelectChild={seleccionarCat}
            />
          )}
        </div>
      </div>

      {importOpen && (
        <ImportarModal
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); load(); setToastMsg('Importación completada'); }}
        />
      )}
    </div>
  );
}
