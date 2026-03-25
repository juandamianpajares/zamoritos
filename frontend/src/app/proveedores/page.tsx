'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type Proveedor, type Compra } from '@/lib/api';
import Modal from '@/components/Modal';

const emptyForm = {
  nombre: '', rut: '', telefono: '', email: '',
  direccion: '', contacto: '', notas: '', activo: true,
};

const inp = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';
const lbl = 'block text-xs font-medium text-zinc-500 mb-1.5';

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200
        ${checked ? 'bg-emerald-500' : 'bg-zinc-200'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200
        ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

// ─── Badge activo ─────────────────────────────────────────────────────────────
function BadgeActivo({ activo }: { activo: boolean }) {
  return activo
    ? <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Activo</span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-400 border border-zinc-200">Inactivo</span>;
}

export default function ProveedoresPage() {
  const [proveedores,  setProveedores]  = useState<Proveedor[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [showInactivo, setShowInactivo] = useState(false);
  const [toggling,     setToggling]     = useState<number | null>(null);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [importOpen,   setImportOpen]   = useState(false);
  const [editId,       setEditId]       = useState<number | null>(null);
  const [form,         setForm]         = useState({ ...emptyForm });
  const [error,        setError]        = useState('');
  const [comprasProveedor, setComprasProveedor] = useState<Compra[]>([]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ todos: '1' });
    if (search) params.set('search', search);
    api.get<Proveedor[]>(`/proveedores?${params}`).then(data => {
      setProveedores(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [search]);

  const visible = showInactivo ? proveedores : proveedores.filter(p => p.activo);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p: Proveedor) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre, rut: p.rut ?? '', telefono: p.telefono ?? '',
      email: p.email ?? '', direccion: p.direccion ?? '',
      contacto: p.contacto ?? '', notas: p.notas ?? '',
      activo: p.activo,
    });
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
    const body = {
      ...form,
      email: form.email || null,
      rut: form.rut || null,
      notas: form.notas || null,
    };
    try {
      if (editId) { await api.put(`/proveedores/${editId}`, body); }
      else        { await api.post('/proveedores', body); }
      setModalOpen(false);
      load();
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar este proveedor?')) return;
    await api.delete(`/proveedores/${id}`);
    load();
  };

  const handleToggleActivo = async (p: Proveedor) => {
    setToggling(p.id);
    try {
      await api.patch(`/proveedores/${p.id}/toggle-activo`, {});
      setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, activo: !x.activo } : x));
    } finally {
      setToggling(null);
    }
  };

  const f = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

  const inactivos = proveedores.filter(p => !p.activo).length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl overflow-y-auto flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Proveedores</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {proveedores.filter(p => p.activo).length} activos
            {inactivos > 0 && <span className="ml-1 text-zinc-300">· {inactivos} inactivos</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)}
            className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-xl hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Importar CSV
          </button>
          <button onClick={openCreate}
            className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
            + Nuevo proveedor
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="flex gap-3 mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, RUT, email…"
          className={`flex-1 ${inp}`}
        />
        {inactivos > 0 && (
          <button
            onClick={() => setShowInactivo(v => !v)}
            className={`text-sm px-4 py-2 rounded-xl border transition-colors flex items-center gap-1.5
              ${showInactivo
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'}`}
          >
            {showInactivo ? 'Ocultar inactivos' : `Ver inactivos (${inactivos})`}
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
            Cargando…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  {['Estado', 'Nombre', 'RUT', 'Teléfono', 'Email', 'Contacto', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(p => (
                  <tr key={p.id}
                    className={`border-b border-zinc-50 last:border-0 transition-colors
                      ${p.activo ? 'hover:bg-zinc-50/60' : 'bg-zinc-50/40 opacity-70 hover:opacity-90'}`}>

                    {/* Toggle activo */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={p.activo}
                          onChange={() => handleToggleActivo(p)}
                          disabled={toggling === p.id}
                        />
                        <BadgeActivo activo={p.activo} />
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-zinc-800">
                      {p.nombre}
                      {(p.saldo_total ?? 0) > 0 && (
                        <span className="ml-2 text-[10px] text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-100">
                          ${(p.saldo_total ?? 0).toLocaleString('es-CL')} deuda
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{p.rut ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">{p.telefono ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {p.email
                        ? <a href={`mailto:${p.email}`} className="hover:text-zinc-800 underline underline-offset-2">{p.email}</a>
                        : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{p.contacto ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(p)}
                        className="text-zinc-500 hover:text-zinc-800 text-xs transition-colors">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-zinc-400">
                      {search ? 'Sin resultados para esa búsqueda' : 'Sin proveedores'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ABM */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? 'Editar proveedor' : 'Nuevo proveedor'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="col-span-2">
              <label className={lbl}>Nombre *</label>
              <input required value={form.nombre} onChange={f('nombre')} className={inp} />
            </div>

            {/* RUT */}
            <div>
              <label className={lbl}>RUT</label>
              <input value={form.rut} onChange={f('rut')} placeholder="212345670" className={inp} />
            </div>

            {/* Teléfono */}
            <div>
              <label className={lbl}>Teléfono</label>
              <input value={form.telefono} onChange={f('telefono')} placeholder="099 123 456" className={inp} />
            </div>

            {/* Email */}
            <div>
              <label className={lbl}>Email</label>
              <input type="email" value={form.email} onChange={f('email')} placeholder="proveedor@mail.com" className={inp} />
            </div>

            {/* Contacto */}
            <div>
              <label className={lbl}>Contacto</label>
              <input value={form.contacto} onChange={f('contacto')} placeholder="Nombre del contacto" className={inp} />
            </div>

            {/* Dirección */}
            <div className="col-span-2">
              <label className={lbl}>Dirección</label>
              <input value={form.direccion} onChange={f('direccion')} className={inp} />
            </div>

            {/* Notas */}
            <div className="col-span-2">
              <label className={lbl}>Notas / Memo</label>
              <textarea
                value={form.notas}
                onChange={f('notas')}
                rows={3}
                placeholder="Condiciones de entrega, precios acordados…"
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400 resize-none"
              />
            </div>

            {/* Activo toggle */}
            <div className="col-span-2 flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3 bg-zinc-50/40">
              <div>
                <p className="text-sm font-medium text-zinc-700">Estado del proveedor</p>
                <p className="text-xs text-zinc-400 mt-0.5">Los proveedores inactivos no aparecen en el listado por defecto ni en las compras</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-xs text-zinc-500">{form.activo ? 'Activo' : 'Inactivo'}</span>
                <Toggle checked={form.activo} onChange={() => setForm(prev => ({ ...prev, activo: !prev.activo }))} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors">
              {editId ? 'Guardar cambios' : 'Crear proveedor'}
            </button>
          </div>
        </form>

        {/* Historial de compras */}
        {editId && comprasProveedor.length > 0 && (
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Historial de pedidos</p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {comprasProveedor.map(c => (
                <div key={c.id} className="rounded-xl border border-zinc-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 tabular-nums">
                      {new Date(c.fecha).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      {c.factura && <span className="ml-2 font-mono text-zinc-300">#{c.factura}</span>}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-800">
                      ${c.total.toLocaleString('es-CL')}
                    </span>
                  </div>
                  {c.nota && (
                    <p className="text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2 mt-1">{c.nota}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal importar */}
      {importOpen && (
        <ImportarProveedoresModal
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); load(); }}
        />
      )}
    </div>
  );
}

// ─── Modal importar proveedores CSV ──────────────────────────────────────────
type ImportResult = {
  creados: number; actualizados: number; omitidos: number;
  errores: { fila: number; error: string }[]; total_filas: number;
};

function ImportarProveedoresModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [archivo,   setArchivo]   = useState<File | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [showFmt,   setShowFmt]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiBase  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

  const importar = async () => {
    if (!archivo) return;
    setLoading(true); setErrorMsg('');
    const fd = new FormData();
    fd.append('archivo', archivo);
    try {
      const res = await fetch(`${apiBase}/proveedores/importar`, {
        method: 'POST', headers: { Accept: 'application/json' }, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? 'Error en el servidor');
      setResultado(data as ImportResult);
    } catch (e: unknown) {
      setErrorMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const FORMATO = `Columnas (separador ; o ,):
  rut ; nombre ; telefono ; email ; direccion ; contacto ; notas ; activo

Ejemplo:
212345670;DISTRIBUIDORA LAGER SA;099123456;lager@mail.com;Av. Italia 1234;Carlos Lopez;Entrega lunes;1
211234560;PRIMOCAO URUGUAY;098654321;;;Ana Martinez;;1
200111222;PROVEEDOR INACTIVO;;;;John Doe;;0

Reglas:
• rut y nombre son obligatorios
• activo: 1=activo, 0=inactivo (default: activo al crear)
• Si el RUT ya existe → actualiza datos de contacto (idempotente)
• Si el RUT no existe → crea el proveedor
• Compatible con exportación SICFE/Kitfe (RUT sin puntos ni guión)`;

  return (
    <Modal isOpen onClose={onClose} title="Importar proveedores desde CSV" size="lg">
      <div className="space-y-4 text-sm">
        {resultado ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{resultado.creados}</p>
                <p className="text-xs text-emerald-500 mt-0.5">Creados</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{resultado.actualizados}</p>
                <p className="text-xs text-blue-500 mt-0.5">Actualizados</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{resultado.errores.length}</p>
                <p className="text-xs text-rose-500 mt-0.5">Errores</p>
              </div>
            </div>
            {resultado.errores.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1">
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-xs text-rose-500 bg-rose-50 px-2 py-1 rounded">
                    Fila {e.fila}: {e.error}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cerrar</button>
              <button onClick={onDone}  className="flex-1 py-2.5 font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800">Ver proveedores</button>
            </div>
          </div>
        ) : (
          <>
            {/* Compatibilidad SICFE/Kitfe */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
              <p className="font-semibold text-blue-800">Compatibilidad SICFE / Kitfe</p>
              <p>
                El campo <code className="bg-blue-100 px-1 rounded">rut</code> es el identificador único
                para deduplicar. Exportá el listado desde tu sistema de facturación en formato CSV y ajustá
                las columnas al formato esperado. El RUT debe ir sin puntos ni guión
                (ej: <code className="bg-blue-100 px-1 rounded">212345670</code>).
              </p>
            </div>

            <button onClick={() => setShowFmt(v => !v)}
              className="w-full text-left text-xs text-violet-600 border border-violet-200 rounded-xl px-3 py-2 hover:bg-violet-50 flex items-center justify-between">
              <span>📋 Ver formato y ejemplo</span>
              <span>{showFmt ? '▲' : '▼'}</span>
            </button>
            {showFmt && (
              <div className="bg-zinc-50 rounded-xl border border-zinc-100 overflow-x-auto">
                <pre className="text-[10px] text-zinc-600 p-3 whitespace-pre-wrap leading-relaxed">{FORMATO}</pre>
              </div>
            )}

            {/* Zona drop */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Archivo CSV</label>
              <div onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-400 transition-colors">
                {archivo ? (
                  <p className="text-sm font-medium text-zinc-700">{archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)</p>
                ) : (
                  <div>
                    <p className="text-sm text-zinc-400">Hacé clic para elegir el archivo CSV</p>
                    <p className="text-xs text-zinc-300 mt-1">Exportado desde SICFE, Kitfe u otro sistema de facturación</p>
                  </div>
                )}
              </div>
              <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
                onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3 py-2 rounded-xl">{errorMsg}</div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancelar</button>
              <button onClick={importar} disabled={!archivo || loading}
                className="flex-1 py-2.5 font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40">
                {loading ? 'Importando…' : 'Importar'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
