'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type Proveedor, type Compra, type PagoProveedor } from '@/lib/api';
import Modal from '@/components/Modal';

const emptyForm = {
  nombre: '', rut: '', telefono: '', email: '',
  direccion: '', contacto: '', notas: '', activo: true,
};

function fmt(n: number) {
  return `$${Math.round(Math.abs(n)).toLocaleString('es-CL')}`;
}

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
  const [pagosProveedor,   setPagosProveedor]   = useState<PagoProveedor[]>([]);
  const [proveedorSaldo,   setProveedorSaldo]   = useState<Proveedor | null>(null);
  const [pagarCompra,      setPagarCompra]      = useState<Compra | null>(null);

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
    setPagosProveedor([]);
    setProveedorSaldo(p);
    api.get<Compra[]>(`/compras?proveedor_id=${p.id}`)
      .then(cs => setComprasProveedor(cs.sort((a, b) => b.fecha.localeCompare(a.fecha))))
      .catch(() => {});
    api.get<PagoProveedor[]>(`/pagos-proveedores?proveedor_id=${p.id}`)
      .then(setPagosProveedor).catch(() => {});
    // Fresh saldo from server
    api.get<Proveedor>(`/proveedores/${p.id}`).then(setProveedorSaldo).catch(() => {});
    setModalOpen(true);
  };

  const refreshProveedorData = (id: number) => {
    api.get<Proveedor>(`/proveedores/${id}`).then(setProveedorSaldo).catch(() => {});
    api.get<Compra[]>(`/compras?proveedor_id=${id}`)
      .then(cs => setComprasProveedor(cs.sort((a, b) => b.fecha.localeCompare(a.fecha))))
      .catch(() => {});
    api.get<PagoProveedor[]>(`/pagos-proveedores?proveedor_id=${id}`)
      .then(setPagosProveedor).catch(() => {});
    // Silently refresh list so table saldo is also up to date
    const params = new URLSearchParams({ todos: '1' });
    if (search) params.set('search', search);
    api.get<Proveedor[]>(`/proveedores?${params}`).then(setProveedores).catch(() => {});
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
                  {['Estado', 'Nombre', 'RUT', 'Teléfono', 'Email', 'Contacto', 'Saldo', ''].map(h => (
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

                    <td className="px-4 py-3 font-medium text-zinc-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{p.rut ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">{p.telefono ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {p.email
                        ? <a href={`mailto:${p.email}`} className="hover:text-zinc-800 underline underline-offset-2">{p.email}</a>
                        : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{p.contacto ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {(p.saldo_total ?? 0) > 0 ? (
                        <span className="text-sm font-semibold text-rose-600">{fmt(p.saldo_total ?? 0)}</span>
                      ) : (p.saldo_total ?? 0) < 0 ? (
                        <span className="text-sm font-semibold text-emerald-600">{fmt(p.saldo_total ?? 0)} a favor</span>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>
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
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-zinc-400">
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

        {/* Saldo financiero */}
        {editId && proveedorSaldo && (
          <div className="mt-5 border-t border-zinc-100 pt-4 space-y-4">
            {/* Tarjetas de saldo */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wide">Compras</p>
                <p className="text-lg font-bold text-rose-600 tabular-nums">{fmt(proveedorSaldo.saldo_compras ?? 0)}</p>
                <p className="text-[9px] text-rose-400">pendiente</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wide">A favor</p>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">{fmt(proveedorSaldo.saldo_a_favor ?? 0)}</p>
                <p className="text-[9px] text-emerald-400">sin aplicar</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${(proveedorSaldo.saldo_total ?? 0) > 0 ? 'bg-red-100' : 'bg-zinc-50'}`}>
                <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wide">Saldo neto</p>
                <p className={`text-lg font-bold tabular-nums ${(proveedorSaldo.saldo_total ?? 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {fmt(proveedorSaldo.saldo_total ?? 0)}
                </p>
                <p className={`text-[9px] ${(proveedorSaldo.saldo_total ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {(proveedorSaldo.saldo_total ?? 0) > 0 ? 'debes' : (proveedorSaldo.saldo_total ?? 0) < 0 ? 'te deben' : 'al día ✓'}
                </p>
              </div>
            </div>

            {/* Pagos a favor sin aplicar */}
            {pagosProveedor.filter(pg => pg.tipo === 'pre_compra' && !pg.compra_id).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Pagos anticipados sin aplicar</p>
                <div className="space-y-1.5">
                  {pagosProveedor.filter(pg => pg.tipo === 'pre_compra' && !pg.compra_id).map(pg => (
                    <div key={pg.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="tabular-nums">{new Date(pg.fecha).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                        <span className="text-zinc-300 capitalize">{pg.medio_pago}</span>
                        {pg.nota && <span className="text-zinc-400 truncate max-w-[120px]">{pg.nota}</span>}
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 tabular-nums">{fmt(pg.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compras con estado de pago */}
            {comprasProveedor.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Historial de compras</p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {comprasProveedor.map(c => {
                    const saldo = c.total - (c.monto_pagado ?? 0);
                    const isPending = c.estado_pago !== 'pagado';
                    return (
                      <div key={c.id} className={`rounded-xl border px-4 py-3 ${isPending ? 'border-rose-100 bg-rose-50/30' : 'border-zinc-100'}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="text-xs text-zinc-400 tabular-nums shrink-0">
                              {new Date(c.fecha).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </span>
                            {c.factura && <span className="font-mono text-[10px] text-zinc-300">#{c.factura}</span>}
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              c.estado_pago === 'pagado'  ? 'bg-emerald-100 text-emerald-600' :
                              c.estado_pago === 'parcial' ? 'bg-amber-100 text-amber-600' :
                                                            'bg-rose-100 text-rose-600'
                            }`}>
                              {c.estado_pago === 'pagado' ? 'Pagado' : c.estado_pago === 'parcial' ? 'Parcial' : 'Pendiente'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-semibold tabular-nums text-zinc-800">{fmt(c.total)}</p>
                              {isPending && <p className="text-[10px] text-rose-500 tabular-nums">debe {fmt(saldo)}</p>}
                            </div>
                            {isPending && (
                              <button
                                onClick={() => setPagarCompra(c)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                              >
                                Pagar
                              </button>
                            )}
                          </div>
                        </div>
                        {c.nota && <p className="text-xs text-zinc-500 mt-1.5">{c.nota}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* Modal pagar compra */}
      {pagarCompra && editId && (
        <PagarCompraModal
          compra={pagarCompra}
          onClose={() => setPagarCompra(null)}
          onDone={() => { setPagarCompra(null); refreshProveedorData(editId); }}
        />
      )}
    </div>
  );
}

// ─── Modal pagar compra ───────────────────────────────────────────────────────
function PagarCompraModal({ compra, onClose, onDone }: { compra: Compra; onClose: () => void; onDone: () => void }) {
  const saldo = compra.total - (compra.monto_pagado ?? 0);
  const [monto,   setMonto]   = useState(String(Math.round(saldo)));
  const [fecha,   setFecha]   = useState(new Date().toISOString().slice(0, 10));
  const [medio,   setMedio]   = useState<'efectivo' | 'transferencia' | 'cheque' | 'otro'>('efectivo');
  const [nota,    setNota]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/pagos-proveedores', {
        proveedor_id: compra.proveedor_id,
        compra_id:    compra.id,
        tipo:         'cuota',
        monto:        Number(monto),
        fecha,
        medio_pago:   medio,
        nota:         nota || null,
      });
      onDone();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const MEDIOS: { v: 'efectivo' | 'transferencia' | 'cheque' | 'otro'; l: string }[] = [
    { v: 'efectivo', l: 'Efectivo' }, { v: 'transferencia', l: 'Transferencia' },
    { v: 'cheque',   l: 'Cheque' },   { v: 'otro',         l: 'Otro' },
  ];

  return (
    <Modal isOpen onClose={onClose} title={`Registrar pago${compra.factura ? ` — #${compra.factura}` : ''}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}

        {/* Resumen */}
        <div className="bg-zinc-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">Total</p>
            <p className="text-base font-bold text-zinc-800 tabular-nums">{fmt(compra.total)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">Pagado</p>
            <p className="text-base font-bold text-emerald-700 tabular-nums">{fmt(compra.monto_pagado ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">Saldo</p>
            <p className="text-base font-bold text-rose-600 tabular-nums">{fmt(saldo)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Monto *</label>
            <input required type="number" min="0.01" step="0.01" value={monto}
              onChange={e => setMonto(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Fecha *</label>
            <input required type="date" value={fecha}
              onChange={e => setFecha(e.target.value)} className={inp} />
          </div>
        </div>

        <div>
          <label className={lbl}>Medio de pago</label>
          <div className="grid grid-cols-4 gap-1.5">
            {MEDIOS.map(m => (
              <button key={m.v} type="button"
                onClick={() => setMedio(m.v)}
                className={`py-2 text-xs font-medium rounded-xl border transition-colors
                  ${medio === m.v ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'}`}>
                {m.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={lbl}>Nota (opcional)</label>
          <input value={nota} onChange={e => setNota(e.target.value)}
            placeholder="Referencia, número de transferencia…" className={inp} />
        </div>

        <div className="flex gap-2 pt-2 border-t border-zinc-100">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm hover:bg-zinc-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-40">
            {loading ? 'Guardando…' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Modal>
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
  const apiBase  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';

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
