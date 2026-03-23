'use client';

import { useEffect, useState } from 'react';
import { api, type Compra, type PagoProveedor, type Proveedor, type CuentasPagar } from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

function diasRestantes(fecha?: string): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86_400_000);
}

const MEDIO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', cheque: 'Cheque', otro: 'Otro',
};

// ── Modal registrar pago ───────────────────────────────────────────────────────

function PagarModal({
  compra,
  onClose,
  onDone,
}: {
  compra: Compra & { saldo: number };
  onClose: () => void;
  onDone: () => void;
}) {
  const [monto,      setMonto]      = useState(String(compra.saldo));
  const [fecha,      setFecha]      = useState(new Date().toISOString().slice(0, 10));
  const [medio,      setMedio]      = useState<'efectivo' | 'transferencia' | 'cheque' | 'otro'>('efectivo');
  const [referencia, setReferencia] = useState('');
  const [nota,       setNota]       = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

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
        referencia:   referencia || null,
        nota:         nota || null,
      });
      onDone();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white';
  const lbl = 'block text-xs font-medium text-zinc-500 mb-1.5';

  return (
    <Modal isOpen onClose={onClose} title={`Registrar pago — Compra #${compra.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}

        {/* Resumen */}
        <div className="bg-zinc-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">Total compra</p>
            <p className="text-base font-bold text-zinc-800 tabular-nums">{fmt(compra.total)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">Ya pagado</p>
            <p className="text-base font-bold text-emerald-700 tabular-nums">{fmt(compra.monto_pagado ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">Saldo</p>
            <p className="text-base font-bold text-rose-600 tabular-nums">{fmt(compra.saldo)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Monto *</label>
            <input required type="number" step="1" min="1" max={compra.saldo}
              value={monto} onChange={e => setMonto(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Fecha *</label>
            <input required type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inp} />
          </div>
        </div>

        <div>
          <label className={lbl}>Medio de pago</label>
          <div className="flex gap-2">
            {(['efectivo', 'transferencia', 'cheque', 'otro'] as const).map(m => (
              <button key={m} type="button"
                onClick={() => setMedio(m)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-xl border-2 transition-all capitalize ${
                  medio === m ? 'bg-zinc-800 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                }`}
              >{MEDIO_LABEL[m]}</button>
            ))}
          </div>
        </div>

        {(medio === 'transferencia' || medio === 'cheque') && (
          <div>
            <label className={lbl}>{medio === 'cheque' ? 'N° de cheque' : 'Referencia transferencia'}</label>
            <input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Opcional" className={inp} />
          </div>
        )}

        <div>
          <label className={lbl}>Nota</label>
          <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Opcional" className={inp} />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancelar</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
            {loading ? 'Registrando…' : 'Confirmar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal pre-compra ───────────────────────────────────────────────────────────

function PreCompraModal({
  proveedores,
  onClose,
  onDone,
}: {
  proveedores: Proveedor[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [provId,     setProvId]     = useState('');
  const [monto,      setMonto]      = useState('');
  const [fecha,      setFecha]      = useState(new Date().toISOString().slice(0, 10));
  const [medio,      setMedio]      = useState<'efectivo' | 'transferencia' | 'cheque' | 'otro'>('efectivo');
  const [referencia, setReferencia] = useState('');
  const [nota,       setNota]       = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/pagos-proveedores', {
        proveedor_id: Number(provId),
        compra_id:    null,
        tipo:         'pre_compra',
        monto:        Number(monto),
        fecha,
        medio_pago:   medio,
        referencia:   referencia || null,
        nota:         nota || null,
      });
      onDone();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white';
  const lbl = 'block text-xs font-medium text-zinc-500 mb-1.5';

  return (
    <Modal isOpen onClose={onClose} title="Pre-compra — Anticipo a proveedor">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}
        <p className="text-xs text-zinc-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
          Registrá un pago anticipado a proveedor. Cuando llegue la mercadería, podés asociarlo a la compra correspondiente desde el detalle.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={lbl}>Proveedor *</label>
            <select required value={provId} onChange={e => setProvId(e.target.value)} className={inp}>
              <option value="">Seleccionar…</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Monto *</label>
            <input required type="number" step="1" min="1"
              value={monto} onChange={e => setMonto(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Fecha *</label>
            <input required type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inp} />
          </div>
        </div>

        <div>
          <label className={lbl}>Medio de pago</label>
          <div className="flex gap-2">
            {(['efectivo', 'transferencia', 'cheque', 'otro'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMedio(m)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-xl border-2 transition-all capitalize ${
                  medio === m ? 'bg-zinc-800 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                }`}
              >{MEDIO_LABEL[m]}</button>
            ))}
          </div>
        </div>

        {(medio === 'transferencia' || medio === 'cheque') && (
          <div>
            <label className={lbl}>{medio === 'cheque' ? 'N° de cheque' : 'Referencia'}</label>
            <input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Opcional" className={inp} />
          </div>
        )}

        <div>
          <label className={lbl}>Nota / concepto</label>
          <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: Seña pedido FORTACHON marzo" className={inp} />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancelar</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Registrando…' : 'Registrar pre-compra'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function CuentasPagarPage() {
  const [data,           setData]           = useState<CuentasPagar | null>(null);
  const [preCompras,     setPreCompras]     = useState<PagoProveedor[]>([]);
  const [proveedores,    setProveedores]    = useState<Proveedor[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [pagarModal,     setPagarModal]     = useState<(Compra & { saldo: number }) | null>(null);
  const [preCompraOpen,  setPreCompraOpen]  = useState(false);
  const [toast,          setToast]          = useState('');

  const load = async () => {
    setLoading(true);
    const [cuentas, pre, provs] = await Promise.all([
      api.get<CuentasPagar>('/cuentas-pagar'),
      api.get<PagoProveedor[]>('/pagos-proveedores?sin_asociar=1'),
      api.get<Proveedor[]>('/proveedores'),
    ]);
    setData(cuentas);
    setPreCompras(pre);
    setProveedores(provs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePagoDone = () => {
    setPagarModal(null);
    setToast('Pago registrado');
    load();
  };

  const handlePreCompraDone = () => {
    setPreCompraOpen(false);
    setToast('Pre-compra registrada');
    load();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-2 text-sm text-zinc-400">
        <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
        Cargando…
      </div>
    );
  }

  const compras = data?.compras ?? [];

  // Clasificar: vencidas, próximas (≤7d), ok
  const hoy      = new Date();
  const vencidas  = compras.filter(c => c.fecha_vencimiento && new Date(c.fecha_vencimiento) < hoy);
  const proximas  = compras.filter(c => {
    if (!c.fecha_vencimiento) return false;
    const d = new Date(c.fecha_vencimiento);
    return d >= hoy && (d.getTime() - hoy.getTime()) / 86_400_000 <= 7;
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl overflow-y-auto flex-1">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Cuentas a pagar</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Compras pendientes y diferidas con proveedores</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPreCompraOpen(true)}
            className="border border-blue-200 text-blue-700 text-sm px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-1.5">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Pre-compra
          </button>
          <a href="/compras"
            className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-xl hover:bg-zinc-50 transition-colors">
            ← Compras
          </a>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-zinc-100 rounded-xl px-4 py-3 text-center">
          <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-0.5">Total pendiente</p>
          <p className="text-xl font-bold text-rose-600 tabular-nums">{fmt(data?.total_pendiente ?? 0)}</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-xl px-4 py-3 text-center">
          <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-0.5">Facturas</p>
          <p className="text-xl font-bold text-zinc-800 tabular-nums">{compras.length}</p>
        </div>
        <div className={`rounded-xl px-4 py-3 text-center border-2 ${vencidas.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-zinc-100'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${vencidas.length > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>Vencidas</p>
          <p className={`text-xl font-bold tabular-nums ${vencidas.length > 0 ? 'text-rose-700' : 'text-zinc-400'}`}>{vencidas.length}</p>
        </div>
        <div className={`rounded-xl px-4 py-3 text-center border-2 ${proximas.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-zinc-100'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${proximas.length > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>Vencen en 7d</p>
          <p className={`text-xl font-bold tabular-nums ${proximas.length > 0 ? 'text-amber-700' : 'text-zinc-400'}`}>{proximas.length}</p>
        </div>
      </div>

      {/* Tabla de compras pendientes */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-zinc-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-700">Compras con saldo pendiente</p>
        </div>
        {compras.length === 0 ? (
          <div className="py-14 text-center text-sm text-zinc-400">
            <svg className="w-8 h-8 mx-auto mb-3 text-zinc-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Todo pagado — sin cuentas pendientes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  {['#', 'Proveedor', 'Factura', 'Vencimiento', 'Total', 'Pagado', 'Saldo', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compras.map(c => {
                  const dias = diasRestantes(c.fecha_vencimiento);
                  const esVencida = dias !== null && dias < 0;
                  const esProxima = dias !== null && dias >= 0 && dias <= 7;
                  return (
                    <tr key={c.id} className={`border-b border-zinc-50 last:border-0 transition-colors ${
                      esVencida ? 'bg-rose-50/60 hover:bg-rose-50' : esProxima ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-zinc-50/60'
                    }`}>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">#{c.id}</td>
                      <td className="px-4 py-3 font-medium text-zinc-800">{c.proveedor?.nombre ?? <span className="text-zinc-400">—</span>}</td>
                      <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{c.factura ?? '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        {c.fecha_vencimiento ? (
                          <span className={esVencida ? 'font-semibold text-rose-600' : esProxima ? 'font-semibold text-amber-600' : 'text-zinc-600'}>
                            {new Date(c.fecha_vencimiento).toLocaleDateString('es-CL')}
                            {dias !== null && (
                              <span className="ml-1 text-[10px]">
                                {esVencida ? `(vencida hace ${Math.abs(dias)}d)` : dias === 0 ? '(hoy)' : `(en ${dias}d)`}
                              </span>
                            )}
                          </span>
                        ) : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-zinc-800">{fmt(c.total)}</td>
                      <td className="px-4 py-3 tabular-nums text-emerald-700">{fmt(c.monto_pagado ?? 0)}</td>
                      <td className="px-4 py-3 font-bold tabular-nums text-rose-600">{fmt(c.saldo)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          c.estado_pago === 'parcial' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600'
                        }`}>{c.estado_pago}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setPagarModal(c)}
                          className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                        >Pagar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pre-compras sin asociar */}
      {preCompras.length > 0 && (
        <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-blue-50 bg-blue-50/40">
            <p className="text-sm font-semibold text-blue-800">Pre-compras pendientes de asociar</p>
            <p className="text-xs text-blue-500 mt-0.5">Anticipos pagados que todavía no tienen compra vinculada</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-50">
                  {['#', 'Proveedor', 'Fecha', 'Monto', 'Medio', 'Nota'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-blue-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preCompras.map(p => (
                  <tr key={p.id} className="border-b border-blue-50/60 last:border-0 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">#{p.id}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{p.proveedor?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(p.fecha).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3 font-bold tabular-nums text-blue-700">{fmt(p.monto)}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{MEDIO_LABEL[p.medio_pago]}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{p.nota ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {pagarModal && (
        <PagarModal compra={pagarModal} onClose={() => setPagarModal(null)} onDone={handlePagoDone} />
      )}
      {preCompraOpen && (
        <PreCompraModal proveedores={proveedores} onClose={() => setPreCompraOpen(false)} onDone={handlePreCompraDone} />
      )}
    </div>
  );
}
