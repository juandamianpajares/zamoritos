'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api, type Cliente, type Pedido, type EstadoPedido } from '@/lib/api';

const fmt  = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' });

const ESTADO_CFG: Record<EstadoPedido, { label: string; pill: string }> = {
  pendiente:     { label: 'Pendiente',     pill: 'bg-amber-100 text-amber-700' },
  preparando:    { label: 'Preparando',    pill: 'bg-orange-100 text-orange-700' },
  confirmado:    { label: 'Confirmado',    pill: 'bg-blue-100 text-blue-700' },
  sin_facturar:  { label: 'Sin facturar',  pill: 'bg-yellow-100 text-yellow-700' },
  enviado:       { label: 'Enviado',       pill: 'bg-violet-100 text-violet-700' },
  entregado:     { label: 'Entregado',     pill: 'bg-emerald-100 text-emerald-700' },
  cancelado:     { label: 'Cancelado',     pill: 'bg-zinc-100 text-zinc-500' },
};

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{children}</span>;
}

const emptyForm = { nombre: '', telefono: '', direccion: '', notas: '' };

// ── Modal ABM Cliente ─────────────────────────────────────────────────────────
function ModalCliente({
  cliente, onClose, onSaved,
}: {
  cliente: Cliente | null;
  onClose: () => void;
  onSaved: (c: Cliente) => void;
}) {
  const [form, setForm] = useState(
    cliente ? { nombre: cliente.nombre, telefono: cliente.telefono ?? '', direccion: cliente.direccion ?? '', notas: cliente.notas ?? '' }
    : { ...emptyForm }
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const body = { nombre: form.nombre, telefono: form.telefono || null, direccion: form.direccion || null, notas: form.notas || null };
      const saved = cliente
        ? await api.put<Cliente>(`/clientes/${cliente.id}`, body)
        : await api.post<Cliente>('/clientes', body);
      onSaved(saved);
    } catch (e: unknown) { setError((e as Error).message); }
    setSaving(false);
  };

  const input = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-violet-400 transition-colors';
  const label = 'block text-xs font-medium text-zinc-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-bold text-zinc-900">{cliente ? 'Editar cliente' : 'Nuevo cliente'}</h2>
        {error && <p className="text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-xl">{error}</p>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className={label}>Nombre *</label>
            <input required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className={input} />
          </div>
          <div>
            <label className={label}>Teléfono / celular</label>
            <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} className={input} placeholder="09X XXX XXX" />
          </div>
          <div>
            <label className={label}>Dirección</label>
            <input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} className={input} />
          </div>
          <div>
            <label className={label}>Notas</label>
            <textarea rows={2} value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} className={input} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Historial Pedidos del Cliente ───────────────────────────────────────
function ModalHistorial({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Pedido[]>(`/pedidos?cliente_id=${cliente.id}`)
      .then(d => { setPedidos(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [cliente.id]);

  // Determinar el pedido "en curso" más reciente (no entregado ni cancelado)
  const enCursoId = pedidos.find(p => !['entregado','cancelado'].includes(p.estado))?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85dvh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">{cliente.nombre}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{cliente.codigo}{cliente.telefono ? ` · ${cliente.telefono}` : ''}</p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="3" x2="15" y2="15"/><line x1="15" y1="3" x2="3" y2="15"/></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-zinc-400 text-center py-8">Cargando…</p>
          ) : pedidos.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Sin pedidos registrados</p>
          ) : (
            <div className="space-y-3">
              {pedidos.map(p => {
                const esEnCurso = p.id === enCursoId;
                const cfg = ESTADO_CFG[p.estado] ?? { label: p.estado, pill: 'bg-zinc-100 text-zinc-500' };
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      esEnCurso
                        ? 'border-violet-300 bg-violet-50 shadow-sm ring-1 ring-violet-200'
                        : 'border-zinc-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-800">{p.numero}</span>
                        {esEnCurso && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500 text-white">EN CURSO</span>
                        )}
                        <Pill color={cfg.pill}>{cfg.label}</Pill>
                      </div>
                      <span className="text-xs text-zinc-400">{fmtDate(p.fecha)}</span>
                    </div>
                    <div className="text-xs text-zinc-500 space-y-0.5">
                      {p.detalles.map((d, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{d.cantidad} × {d.nombre_producto}</span>
                          <span className="tabular-nums">{fmt(d.subtotal)}</span>
                        </div>
                      ))}
                      {p.costo_envio > 0 && (
                        <div className="flex justify-between text-zinc-400">
                          <span>Envío</span>
                          <span className="tabular-nums">{fmt(p.costo_envio)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100">
                      <span className="text-xs text-zinc-400">{p.medio_pago ?? '—'}</span>
                      <span className="text-sm font-bold text-zinc-800 tabular-nums">{fmt(p.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal Importar CSV ────────────────────────────────────────────────────────
function ModalImportar({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file,    setFile]    = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ creados: number; actualizados: number; omitidos: number } | null>(null);
  const [error,   setError]   = useState('');

  const submit = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    const fd = new FormData();
    fd.append('archivo', file);
    try {
      const r = await api.postForm<{ creados: number; actualizados: number; omitidos: number }>('/clientes/importar', fd);
      setResult(r);
      onDone();
    } catch (e: unknown) { setError((e as Error).message); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-bold text-zinc-900">Importar clientes CSV</h2>

        <div className="bg-zinc-50 rounded-xl p-4 text-xs text-zinc-500 space-y-1">
          <p className="font-semibold text-zinc-700">Formato (separador <code>;</code> o coma, primera fila = cabecera):</p>
          <p className="font-mono text-zinc-400">nombre ; telefono ; direccion ; notas ; codigo</p>
          <ul className="list-disc list-inside space-y-0.5 mt-2">
            <li><strong>nombre</strong> es obligatorio.</li>
            <li>Si el <strong>teléfono</strong> ya existe → actualiza el cliente.</li>
            <li>Si el <strong>codigo</strong> viene → usa ese, si no se auto-genera.</li>
          </ul>
        </div>

        {error && <p className="text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-xl">{error}</p>}

        {result ? (
          <div className="text-sm space-y-1">
            <p className="text-emerald-600 font-semibold">✓ Importación completada</p>
            <p>Creados: <strong>{result.creados}</strong></p>
            <p>Actualizados: <strong>{result.actualizados}</strong></p>
            <p>Omitidos: <strong>{result.omitidos}</strong></p>
            <button onClick={onClose} className="mt-3 w-full py-2.5 text-sm font-semibold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors">Cerrar</button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm text-zinc-500 hover:border-violet-400 hover:text-violet-600 transition-colors"
            >
              {file ? `📄 ${file.name}` : 'Seleccionar archivo CSV'}
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors">Cancelar</button>
              <button type="button" onClick={submit} disabled={!file || loading} className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {loading ? 'Importando…' : 'Importar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function ClientesPage() {
  const [clientes,    setClientes]    = useState<Cliente[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [busqueda,    setBusqueda]    = useState('');
  const [modalImport, setModalImport] = useState(false);
  const [confirmDel,  setConfirmDel]  = useState<Cliente | null>(null);
  const [deleting,    setDeleting]    = useState(false);
  const [toast,       setToast]       = useState('');
  const [modalHist,   setModalHist]   = useState<Cliente | null>(null);

  // editTarget: false = cerrado, null = nuevo, Cliente = editar
  const [editTarget, setEditTarget] = useState<Cliente | null | false>(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get<Cliente[]>('/clientes').then(d => { setClientes(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleSaved = (c: Cliente) => {
    setClientes(prev => {
      const idx = prev.findIndex(x => x.id === c.id);
      return idx >= 0 ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev];
    });
    setEditTarget(false);
    showToast('Cliente guardado');
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await api.delete(`/clientes/${confirmDel.id}`);
      setClientes(prev => prev.filter(c => c.id !== confirmDel.id));
      setConfirmDel(null);
      showToast('Cliente eliminado');
    } catch (e: unknown) { alert((e as Error).message); }
    setDeleting(false);
  };

  const filtrados = clientes.filter(c => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return c.nombre.toLowerCase().includes(q)
      || (c.telefono ?? '').includes(q)
      || c.codigo.toLowerCase().includes(q)
      || (c.direccion ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-4 lg:px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono, código…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-violet-400 transition-colors bg-zinc-50"
          />
        </div>
        <button
          onClick={() => setModalImport(true)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Importar
        </button>
        <button
          onClick={() => setEditTarget(null)}
          className="px-3 py-2 text-sm font-semibold rounded-xl text-white bg-violet-600 hover:bg-violet-700 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo
        </button>
      </div>

      {/* Contador */}
      <div className="px-4 lg:px-6 py-2 shrink-0">
        <p className="text-xs text-zinc-400">{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-sm text-zinc-400">
            <span className="w-4 h-4 border-2 border-zinc-200 border-t-violet-500 rounded-full animate-spin" />
            Cargando…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-zinc-400">{busqueda ? 'Sin resultados' : 'Sin clientes registrados'}</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-zinc-100 p-4 flex flex-col gap-2 hover:border-violet-200 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{c.nombre}</p>
                    <p className="text-[11px] text-zinc-400">{c.codigo}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setModalHist(c)}
                      title="Ver pedidos"
                      className="p-1.5 rounded-lg hover:bg-violet-50 text-zinc-400 hover:text-violet-600 transition-colors"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditTarget(c)}
                      title="Editar"
                      className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmDel(c)}
                      title="Eliminar"
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-colors"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                </div>
                {c.telefono && (
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.91 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.88 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17.92z"/>
                    </svg>
                    {c.telefono}
                  </p>
                )}
                {c.direccion && (
                  <p className="text-xs text-zinc-400 truncate">{c.direccion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {editTarget !== false && (
        <ModalCliente
          cliente={editTarget}
          onClose={() => setEditTarget(false)}
          onSaved={handleSaved}
        />
      )}

      {modalHist && (
        <ModalHistorial cliente={modalHist} onClose={() => setModalHist(null)} />
      )}

      {modalImport && (
        <ModalImportar onClose={() => setModalImport(false)} onDone={load} />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDel(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-zinc-900">¿Eliminar cliente?</h2>
            <p className="text-sm text-zinc-500">Se eliminará <strong>{confirmDel.nombre}</strong> y todos sus datos. Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 transition-colors">
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
