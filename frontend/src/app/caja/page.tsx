'use client';

import { useEffect, useState, useMemo } from 'react';
import { api, type CajaDia } from '@/lib/api';

// ── Denominaciones UYU ───────────────────────────────────────────────────────
const BILLETES  = [2000, 1000, 500, 200, 100, 50, 20];
const MONEDAS   = [10, 5, 2, 1];
const DENOMS    = [...BILLETES, ...MONEDAS];

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

function fmtDiff(n: number) {
  if (n === 0) return { text: '$0', cls: 'text-emerald-600' };
  const s = n > 0 ? `+${fmt(n)}` : fmt(n);
  return { text: s, cls: n > 0 ? 'text-emerald-600' : 'text-rose-600' };
}

type Vista = 'arqueo' | 'compras';

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CajaPage() {
  const [vista, setVista]     = useState<Vista>('arqueo');
  const [fecha, setFecha]     = useState(new Date().toISOString().slice(0, 10));
  const [datos, setDatos]     = useState<CajaDia | null>(null);
  const [loading, setLoading] = useState(true);

  // Denominaciones: { 2000: qty, 1000: qty, ... }
  const [cantidades, setCantidades] = useState<Record<number, string>>(
    Object.fromEntries(DENOMS.map(d => [d, '']))
  );
  // Cambio (fondo de cambio)
  const [cambio, setCambio] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get<CajaDia>(`/dashboard/caja?fecha=${fecha}`)
      .then(setDatos)
      .finally(() => setLoading(false));
  }, [fecha]);

  // ── Cálculos denominaciones ──────────────────────────────────────────────
  const totalBilletes = useMemo(() =>
    BILLETES.reduce((s, d) => s + d * (parseInt(cantidades[d] || '0') || 0), 0), [cantidades]);

  const totalMonedas = useMemo(() =>
    MONEDAS.reduce((s, d) => s + d * (parseInt(cantidades[d] || '0') || 0), 0), [cantidades]);

  const totalCaja   = totalBilletes + totalMonedas;
  const fondoCambio = parseFloat(cambio) || 0;
  const suma        = totalCaja + fondoCambio;

  // Efectivo de ventas del día
  const efectivoVentas = useMemo(() => {
    if (!datos) return 0;
    return datos.ventas_por_medio
      .filter(m => m.medio === 'efectivo')
      .reduce((s, m) => s + m.total, 0);
  }, [datos]);

  // Diferencia: Suma contada vs esperada (efectivo ventas + fondo)
  const esperado   = efectivoVentas + fondoCambio;
  const diferencia = suma - esperado;

  const setCantidad = (denom: number, val: string) => {
    if (val !== '' && (isNaN(Number(val)) || Number(val) < 0)) return;
    setCantidades(prev => ({ ...prev, [denom]: val }));
  };

  const limpiar = () => {
    setCantidades(Object.fromEntries(DENOMS.map(d => [d, ''])));
    setCambio('');
  };

  const handlePrint = () => window.print();

  return (
    <div className="p-6 lg:p-8 max-w-6xl">

      {/* ── Print-only cierre de caja ── */}
      <div className="hidden print:block font-sans text-zinc-900">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">CIERRE DE CAJA</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">Impreso: {new Date().toLocaleString('es-CL')}</p>
        </div>

        {/* Ventas */}
        <div className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-zinc-300 pb-1 mb-2">Ventas del día</h2>
          {datos?.ventas_por_medio.map(m => (
            <div key={m.medio} className="flex justify-between text-sm py-0.5">
              <span className="capitalize">{m.medio} ({m.cantidad} ventas)</span>
              <span className="tabular-nums font-medium">{fmt(m.total)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold border-t border-zinc-200 pt-1 mt-1">
            <span>Total ventas</span>
            <span className="tabular-nums">{fmt(datos?.total_ventas ?? 0)}</span>
          </div>
        </div>

        {/* Compras */}
        <div className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-zinc-300 pb-1 mb-2">Compras del día</h2>
          {datos?.compras_por_prov.map(p => (
            <div key={p.proveedor} className="flex justify-between text-sm py-0.5">
              <span>{p.proveedor} ({p.cantidad})</span>
              <span className="tabular-nums font-medium">{fmt(p.total)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold border-t border-zinc-200 pt-1 mt-1">
            <span>Total compras</span>
            <span className="tabular-nums">{fmt(datos?.total_compras ?? 0)}</span>
          </div>
        </div>

        {/* Arqueo */}
        <div className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-zinc-300 pb-1 mb-2">Arqueo de efectivo</h2>
          {DENOMS.map(d => {
            const qty = parseInt(cantidades[d] || '0') || 0;
            if (qty === 0) return null;
            return (
              <div key={d} className="flex justify-between text-sm py-0.5">
                <span>{fmt(d)} × {qty}</span>
                <span className="tabular-nums">{fmt(d * qty)}</span>
              </div>
            );
          })}
          {fondoCambio > 0 && (
            <div className="flex justify-between text-sm py-0.5">
              <span>Fondo de cambio</span>
              <span className="tabular-nums">{fmt(fondoCambio)}</span>
            </div>
          )}
          <div className="border-t border-zinc-200 pt-1 mt-1 space-y-0.5">
            <div className="flex justify-between text-sm">
              <span>Total contado</span>
              <span className="tabular-nums font-medium">{fmt(suma)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Esperado en caja</span>
              <span className="tabular-nums font-medium">{fmt(esperado)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Diferencia</span>
              <span className={`tabular-nums ${diferencia === 0 ? '' : diferencia > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {fmtDiff(diferencia).text}
              </span>
            </div>
          </div>
        </div>

        {/* Resultado neto */}
        <div className="border-t-2 border-zinc-900 pt-3">
          <div className="flex justify-between text-base font-bold">
            <span>Resultado del día (ventas − compras)</span>
            <span className="tabular-nums">{fmt((datos?.total_ventas ?? 0) - (datos?.total_compras ?? 0))}</span>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-300 flex justify-between text-xs text-zinc-400">
          <span>Firma responsable: ______________________________</span>
          <span>Sello</span>
        </div>
      </div>

      {/* ── Screen content (hidden on print) ── */}
      <div className="print:hidden">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Caja</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Arqueo y movimientos del día</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white"
          />
          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-100 p-0.5 rounded-xl">
            {(['arqueo', 'compras'] as Vista[]).map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  vista === v ? 'text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
                style={vista === v ? { background: 'var(--brand-purple)' } : {}}
              >
                {v === 'arqueo' ? 'Arqueo' : 'Compras'}
              </button>
            ))}
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-zinc-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Cerrar caja
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-sm text-zinc-400">
          <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
          Cargando...
        </div>
      ) : vista === 'arqueo' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Izquierda: Contador por denominación ── */}
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
              <h2 className="text-sm font-semibold text-zinc-700">Conteo de efectivo</h2>
              <button onClick={limpiar} className="text-xs text-zinc-400 hover:text-rose-500 transition-colors">
                Limpiar
              </button>
            </div>

            <div className="px-5 py-1">
              {/* Cabecera columnas */}
              <div className="grid grid-cols-3 gap-3 py-2.5 border-b border-zinc-50">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Denominación</span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-center">Cantidad</span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right">Subtotal</span>
              </div>

              {/* Separador billetes */}
              <div className="py-2">
                <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest mb-1">Billetes</p>
                {BILLETES.map(d => {
                  const qty = parseInt(cantidades[d] || '0') || 0;
                  const sub = qty * d;
                  return (
                    <div key={d} className="grid grid-cols-3 gap-3 items-center py-1.5">
                      <span className="text-sm font-semibold text-zinc-700 tabular-nums">{fmt(d)}</span>
                      <input
                        type="number"
                        min={0}
                        value={cantidades[d]}
                        onChange={e => setCantidad(d, e.target.value)}
                        placeholder="0"
                        className="text-center text-sm border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--brand-purple)] tabular-nums w-full"
                      />
                      <span className={`text-sm text-right tabular-nums font-medium ${sub > 0 ? 'text-zinc-800' : 'text-zinc-300'}`}>
                        {sub > 0 ? fmt(sub) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Separador monedas */}
              <div className="py-2 border-t border-zinc-50">
                <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest mb-1">Monedas</p>
                {MONEDAS.map(d => {
                  const qty = parseInt(cantidades[d] || '0') || 0;
                  const sub = qty * d;
                  return (
                    <div key={d} className="grid grid-cols-3 gap-3 items-center py-1.5">
                      <span className="text-sm font-semibold text-zinc-700 tabular-nums">{fmt(d)}</span>
                      <input
                        type="number"
                        min={0}
                        value={cantidades[d]}
                        onChange={e => setCantidad(d, e.target.value)}
                        placeholder="0"
                        className="text-center text-sm border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--brand-purple)] tabular-nums w-full"
                      />
                      <span className={`text-sm text-right tabular-nums font-medium ${sub > 0 ? 'text-zinc-800' : 'text-zinc-300'}`}>
                        {sub > 0 ? fmt(sub) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Totales billetes/monedas */}
              <div className="border-t border-zinc-100 py-3 space-y-1">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Billetes</span>
                  <span className="tabular-nums font-medium">{fmt(totalBilletes)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Monedas</span>
                  <span className="tabular-nums font-medium">{fmt(totalMonedas)}</span>
                </div>
              </div>
            </div>

            {/* Footer totales */}
            <div className="px-5 pb-5 space-y-2">
              <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-3">
                <span className="text-sm font-semibold text-zinc-700">Caja (contado)</span>
                <span className="text-xl font-bold tabular-nums text-zinc-900">{fmt(totalCaja)}</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-zinc-600 whitespace-nowrap">Fondo de cambio</label>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                  <input
                    type="number"
                    min={0}
                    value={cambio}
                    onChange={e => setCambio(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-[var(--brand-purple)] tabular-nums text-right"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-zinc-900 text-white rounded-xl px-4 py-3">
                <span className="text-sm font-semibold">Suma total</span>
                <span className="text-xl font-bold tabular-nums">{fmt(suma)}</span>
              </div>
            </div>
          </div>

          {/* ── Derecha: Resumen del día ── */}
          <div className="space-y-4">

            {/* Ventas del día */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-50">
                <h2 className="text-sm font-semibold text-zinc-700">Ventas del día</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{datos?.cantidad_ventas ?? 0} transacciones</p>
              </div>
              <div className="px-5 py-3 space-y-1">
                {datos?.ventas_por_medio.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-3 text-center">Sin ventas</p>
                ) : datos?.ventas_por_medio.map(m => (
                  <div key={m.medio} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${m.medio === 'efectivo' ? 'bg-emerald-400' : 'bg-sky-400'}`} />
                      <span className="text-sm text-zinc-600 capitalize">{m.medio}</span>
                      <span className="text-xs text-zinc-400">({m.cantidad})</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-zinc-800">{fmt(m.total)}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-zinc-50 flex justify-between">
                <span className="text-sm font-semibold text-zinc-700">Total ventas</span>
                <span className="text-lg font-bold tabular-nums text-emerald-600">{fmt(datos?.total_ventas ?? 0)}</span>
              </div>
            </div>

            {/* Compras del día */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-50">
                <h2 className="text-sm font-semibold text-zinc-700">Compras del día</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{datos?.cantidad_compras ?? 0} órdenes de compra</p>
              </div>
              <div className="px-5 py-3 space-y-1">
                {datos?.compras_por_prov.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-3 text-center">Sin compras</p>
                ) : datos?.compras_por_prov.map(p => (
                  <div key={p.proveedor} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="text-sm text-zinc-600 truncate max-w-36">{p.proveedor}</span>
                      <span className="text-xs text-zinc-400">({p.cantidad})</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-zinc-800">{fmt(p.total)}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-zinc-50 flex justify-between">
                <span className="text-sm font-semibold text-zinc-700">Total compras</span>
                <span className="text-lg font-bold tabular-nums text-rose-600">{fmt(datos?.total_compras ?? 0)}</span>
              </div>
            </div>

            {/* Arqueo / Diferencia */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-50">
                <h2 className="text-sm font-semibold text-zinc-700">Arqueo de caja</h2>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Efectivo ventas</span>
                  <span className="font-semibold tabular-nums text-emerald-600">{fmt(efectivoVentas)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">+ Fondo de cambio</span>
                  <span className="font-semibold tabular-nums text-zinc-700">{fmt(fondoCambio)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-zinc-50 pt-2.5">
                  <span className="text-zinc-500">Esperado en caja</span>
                  <span className="font-semibold tabular-nums text-zinc-800">{fmt(esperado)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Contado</span>
                  <span className="font-semibold tabular-nums text-zinc-800">{fmt(suma)}</span>
                </div>

                <div className={`flex justify-between items-center rounded-xl px-4 py-3 mt-1 ${
                  diferencia === 0
                    ? 'bg-emerald-50 border border-emerald-100'
                    : Math.abs(diferencia) <= 50
                    ? 'bg-amber-50 border border-amber-100'
                    : 'bg-rose-50 border border-rose-100'
                }`}>
                  <span className={`text-sm font-bold ${
                    diferencia === 0 ? 'text-emerald-700' : Math.abs(diferencia) <= 50 ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    Diferencia
                  </span>
                  <span className={`text-lg font-bold tabular-nums ${
                    diferencia === 0 ? 'text-emerald-700' : Math.abs(diferencia) <= 50 ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {(() => { const d = fmtDiff(diferencia); return d.text; })()}
                  </span>
                </div>

                {/* Resultado neto (ventas - compras) */}
                <div className="flex justify-between items-center border-t border-zinc-50 pt-3 mt-2">
                  <span className="text-sm font-semibold text-zinc-700">Resultado del día</span>
                  <span className={`text-lg font-bold tabular-nums ${
                    (datos?.total_ventas ?? 0) >= (datos?.total_compras ?? 0) ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {fmt((datos?.total_ventas ?? 0) - (datos?.total_compras ?? 0))}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      ) : (
        /* ── Vista Compras ── */
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {datos?.compras.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">
              No hay compras registradas para esta fecha
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    {['#', 'Proveedor', 'Factura', 'Productos', 'Total', 'Fecha'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos?.compras.map(c => (
                    <tr key={c.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3 text-zinc-400 text-xs font-mono">#{c.id}</td>
                      <td className="px-4 py-3 font-medium text-zinc-800">{c.proveedor?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{c.factura ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{c.detalles?.length ?? 0} ítem(s)</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-rose-600">{fmt(c.total)}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs tabular-nums">
                        {new Date(c.fecha).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-100 bg-zinc-50">
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Total</td>
                    <td className="px-4 py-3 font-bold text-base tabular-nums text-rose-600">{fmt(datos?.total_compras ?? 0)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      </div>{/* end print:hidden */}
    </div>
  );
}
