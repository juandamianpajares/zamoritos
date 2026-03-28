'use client';

import { useEffect, useState } from 'react';
import { api, type GananciaDashboard, type Venta } from '@/lib/api';

const fmt  = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtDiff = (n: number) => {
  if (n === 0) return { text: '$0', cls: 'text-zinc-400' };
  const abs = fmt(Math.abs(n));
  return n > 0 ? { text: `+${abs}`, cls: 'text-emerald-600 font-semibold' }
               : { text: `-${abs}`, cls: 'text-rose-600 font-semibold' };
};

// ── Período ───────────────────────────────────────────────────────────────────
function generarPeriodos(n = 12) {
  const list: { label: string; desde: string; hasta: string }[] = [];
  const hoy = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const desde = d.toISOString().slice(0, 10);
    const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const hasta  = i === 0 ? hoy.toISOString().slice(0, 10) : ultimo.toISOString().slice(0, 10);
    const label  = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    list.push({ label: label.charAt(0).toUpperCase() + label.slice(1), desde, hasta });
  }
  return list;
}

const PERIODOS = generarPeriodos();

// ── Utilidades ────────────────────────────────────────────────────────────────
const MEDIO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'VISA débito', oca: 'OCA',
  master: 'MasterCard', anda: 'ANDA', cabal: 'CABAL',
  transferencia: 'Transferencia', otro: 'Otro', sicfe: 'SICFE',
};
const MEDIO_COLOR: Record<string, string> = {
  efectivo: 'bg-emerald-100 text-emerald-700', tarjeta: 'bg-sky-100 text-sky-700',
  master: 'bg-red-100 text-red-700', oca: 'bg-orange-100 text-orange-700',
  anda: 'bg-cyan-100 text-cyan-700', cabal: 'bg-purple-100 text-purple-700',
  transferencia: 'bg-violet-100 text-violet-700', otro: 'bg-zinc-100 text-zinc-600',
};
const TARJETAS = new Set(['tarjeta', 'master', 'oca', 'cabal', 'anda']);

function Pill({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{children}</span>;
}
function StatCard({ label, value, sub, color = 'text-zinc-900' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 px-5 py-4 flex flex-col gap-1">
      <p className="text-xs text-zinc-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

// ── Datos compartidos entre tabs ──────────────────────────────────────────────
interface DatosContabilidad {
  ganancia: GananciaDashboard | null;
  ventas: Venta[];
  loading: boolean;
  desde: string;
  hasta: string;
}

// ── Tab: Resumen ──────────────────────────────────────────────────────────────
function TabResumen({ d }: { d: DatosContabilidad }) {
  if (d.loading) return <div className="p-12 text-center text-sm text-zinc-400">Cargando…</div>;
  if (!d.ganancia) return null;

  const g = d.ganancia;

  // Desglose por medio de pago desde las ventas del período
  const porMedio = d.ventas
    .filter(v => v.estado === 'confirmada')
    .reduce<Record<string, number>>((acc, v) => {
      const m = v.medio_pago ?? 'otro';
      acc[m] = (acc[m] ?? 0) + v.total;
      return acc;
    }, {});

  const mediosOrdenados = Object.entries(porMedio).sort((a, b) => b[1] - a[1]);
  const totalMedios = Object.values(porMedio).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Ventas" value={fmt(g.total_ventas)} color="text-emerald-700" />
        <StatCard label="Compras contado" value={fmt(g.total_compras)} color="text-rose-600" />
        <StatCard label="Costo de lo vendido" value={fmt(g.total_costo)} color="text-amber-600" />
        <StatCard label="Ganancia neta" value={fmt(g.ganancia_neta)} sub={`Margen ${g.margen_pct}%`} color={g.ganancia_neta >= 0 ? 'text-emerald-700' : 'text-rose-600'} />
      </div>

      {/* Ingresos por medio de pago */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-50">
          <h3 className="text-sm font-semibold text-zinc-700">Ingresos por medio de cobro</h3>
        </div>
        {mediosOrdenados.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-400 text-center">Sin ventas en el período</p>
        ) : (
          <div className="p-5 space-y-3">
            {mediosOrdenados.map(([m, total]) => (
              <div key={m} className="flex items-center gap-3">
                <span className="text-sm text-zinc-600 w-28 truncate">{MEDIO_LABEL[m] ?? m}</span>
                <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--brand-purple)]"
                    style={{ width: `${totalMedios > 0 ? (total / totalMedios) * 100 : 0}%`, opacity: 0.7 }} />
                </div>
                <span className="text-sm font-semibold tabular-nums text-zinc-700 w-24 text-right">{fmt(total)}</span>
                <span className="text-xs text-zinc-400 w-10 text-right">{totalMedios > 0 ? ((total / totalMedios) * 100).toFixed(0) : 0}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ganancia por proveedor */}
      {g.por_proveedor.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-50">
            <h3 className="text-sm font-semibold text-zinc-700">Ganancia por proveedor</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-50">
                <th className="px-5 py-2.5 text-left font-medium">Proveedor</th>
                <th className="px-4 py-2.5 text-right font-medium">Ventas</th>
                <th className="px-4 py-2.5 text-right font-medium">Costo</th>
                <th className="px-4 py-2.5 text-right font-medium">Ganancia</th>
                <th className="px-4 py-2.5 text-right font-medium">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {g.por_proveedor.map(p => (
                <tr key={p.proveedor} className="hover:bg-zinc-50/50">
                  <td className="px-5 py-3 font-medium text-zinc-800">{p.proveedor}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{fmt(p.total_ventas)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-500">{fmt(p.total_costo)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${p.ganancia >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{fmt(p.ganancia)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-500">{p.margen_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Medios de pago (reemplaza Débito mock) ───────────────────────────────
function TabMedios({ d }: { d: DatosContabilidad }) {
  const [filtro, setFiltro] = useState<'todos' | 'efectivo' | 'tarjetas' | 'transferencia'>('todos');

  if (d.loading) return <div className="p-12 text-center text-sm text-zinc-400">Cargando…</div>;

  const ventasConf = d.ventas.filter(v => v.estado === 'confirmada');

  const ventasFiltradas = ventasConf.filter(v => {
    const m = v.medio_pago ?? 'otro';
    if (filtro === 'efectivo') return m === 'efectivo';
    if (filtro === 'tarjetas') return TARJETAS.has(m);
    if (filtro === 'transferencia') return m === 'transferencia';
    return true;
  });

  // Agrupar por medio
  const grupos = Object.entries(
    ventasConf.reduce<Record<string, { total: number; cant: number }>>((acc, v) => {
      const m = v.medio_pago ?? 'otro';
      if (!acc[m]) acc[m] = { total: 0, cant: 0 };
      acc[m].total += v.total; acc[m].cant++;
      return acc;
    }, {})
  ).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {([['todos','Todos'],['efectivo','Efectivo'],['tarjetas','Tarjetas'],['transferencia','Transferencia']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-[9px] transition-colors ${filtro === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Resumen por medio */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {grupos.slice(0, 4).map(([m, g]) => (
          <StatCard key={m} label={MEDIO_LABEL[m] ?? m} value={fmt(g.total)} sub={`${g.cant} ventas`} />
        ))}
      </div>

      {/* Tabla de ventas */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700">Ventas del período</h3>
          <span className="text-xs text-zinc-400">{ventasFiltradas.length} ventas · {fmt(ventasFiltradas.reduce((s, v) => s + v.total, 0))}</span>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50/90">
              <tr className="text-xs text-zinc-400 border-b border-zinc-100">
                <th className="px-5 py-2.5 text-left font-medium">Fecha</th>
                <th className="px-4 py-2.5 text-left font-medium">Medio</th>
                <th className="px-4 py-2.5 text-left font-medium">Factura</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {ventasFiltradas.slice().reverse().map(v => (
                <tr key={v.id} className={`hover:bg-zinc-50/50 ${v.estado === 'anulada' ? 'opacity-40' : ''}`}>
                  <td className="px-5 py-2.5 tabular-nums text-zinc-500 text-xs">
                    {new Date(v.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <Pill cls={MEDIO_COLOR[v.medio_pago ?? 'otro'] ?? 'bg-zinc-100 text-zinc-600'}>
                      {MEDIO_LABEL[v.medio_pago ?? 'otro'] ?? v.medio_pago ?? '—'}
                    </Pill>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-zinc-400">{v.numero_factura ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-zinc-800">{fmt(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Crédito ──────────────────────────────────────────────────────────────
function TabCredito({ d }: { d: DatosContabilidad }) {
  if (d.loading) return <div className="p-12 text-center text-sm text-zinc-400">Cargando…</div>;

  const credito = d.ventas.filter(v => v.tipo_pago === 'credito' && v.estado === 'confirmada');
  const totalCredito = credito.reduce((s, v) => s + v.total, 0);
  const totalTarjetas = d.ventas
    .filter(v => v.estado === 'confirmada' && TARJETAS.has(v.medio_pago ?? ''))
    .reduce((s, v) => s + v.total, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Ventas a crédito" value={fmt(totalCredito)} sub={`${credito.length} transacciones`} color="text-blue-700" />
        <StatCard label="Cobrado con tarjeta" value={fmt(totalTarjetas)} sub="VISA · Master · ANDA · CABAL · OCA" />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-50">
          <h3 className="text-sm font-semibold text-zinc-700">Ventas a crédito del período</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Ventas registradas como "crédito" (cobro diferido)</p>
        </div>
        {credito.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">Sin ventas a crédito en el período</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-50">
                <th className="px-5 py-2.5 text-left font-medium">Fecha</th>
                <th className="px-4 py-2.5 text-left font-medium">Receptor</th>
                <th className="px-4 py-2.5 text-left font-medium">Factura</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {credito.slice().reverse().map(v => (
                <tr key={v.id} className="hover:bg-zinc-50/50">
                  <td className="px-5 py-3 tabular-nums text-zinc-500 text-xs">
                    {new Date(v.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{v.receptor_nombre ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{v.numero_factura ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-800">{fmt(v.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50/50">
                <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-zinc-700">Total</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-blue-700">{fmt(totalCredito)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className="bg-sky-50 border border-sky-100 rounded-2xl px-5 py-4 text-xs text-sky-800">
        <strong>Tarjetas de crédito:</strong> Las acreditaciones dependen del cierre de lote del POS. El sistema registra el monto vendido; el seguimiento de acreditación bancaria se realiza manualmente.
      </div>
    </div>
  );
}

// ── Tab: Balance (P&L) ────────────────────────────────────────────────────────
function TabBalance({ d }: { d: DatosContabilidad }) {
  if (d.loading) return <div className="p-12 text-center text-sm text-zinc-400">Cargando…</div>;
  if (!d.ganancia) return null;

  const g = d.ganancia;
  const neto = g.ganancia_neta;

  const porMedio = d.ventas
    .filter(v => v.estado === 'confirmada')
    .reduce<Record<string, number>>((acc, v) => {
      const m = v.medio_pago ?? 'otro';
      acc[m] = (acc[m] ?? 0) + v.total;
      return acc;
    }, {});

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Ingresos totales"  value={fmt(g.total_ventas)}  color="text-emerald-700" />
        <StatCard label="Costo de lo vendido" value={fmt(g.total_costo)} color="text-amber-600" />
        <StatCard label="Resultado neto"    value={fmt(neto)} color={neto >= 0 ? 'text-emerald-700' : 'text-rose-600'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ingresos */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-700">Ingresos</h3>
          </div>
          <div className="divide-y divide-zinc-50">
            {Object.entries(porMedio).sort((a, b) => b[1] - a[1]).map(([m, total]) => (
              <div key={m} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-zinc-600">{MEDIO_LABEL[m] ?? m}</span>
                <span className="text-sm font-semibold tabular-nums text-emerald-700">{fmt(total)}</span>
              </div>
            ))}
            <div className="px-5 py-3 flex items-center justify-between bg-emerald-50/50">
              <span className="text-sm font-bold text-zinc-700">Total ingresos</span>
              <span className="text-sm font-bold tabular-nums text-emerald-700">{fmt(g.total_ventas)}</span>
            </div>
          </div>
        </div>

        {/* Egresos */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <h3 className="text-sm font-semibold text-zinc-700">Egresos</h3>
          </div>
          <div className="divide-y divide-zinc-50">
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-zinc-600">Compras a proveedores (contado)</span>
              <span className="text-sm font-semibold tabular-nums text-rose-600">{fmt(g.total_compras)}</span>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-zinc-600">Costo de lo vendido (estimado)</span>
              <span className="text-sm font-semibold tabular-nums text-amber-600">{fmt(g.total_costo)}</span>
            </div>
            <div className="px-5 py-3 flex items-center justify-between bg-rose-50/50">
              <span className="text-sm font-bold text-zinc-700">Total egresos registrados</span>
              <span className="text-sm font-bold tabular-nums text-rose-600">{fmt(g.total_compras)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className={`rounded-2xl border px-5 py-4 flex items-center justify-between ${neto >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-1">RESULTADO NETO DEL PERÍODO</p>
          <p className={`text-3xl font-bold tabular-nums ${neto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(neto)}</p>
          <p className="text-sm text-zinc-500 mt-0.5">Margen sobre ventas: <strong>{g.margen_pct}%</strong></p>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
type Tab = 'resumen' | 'medios' | 'credito' | 'balance';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen',  label: 'Resumen'     },
  { id: 'medios',   label: 'Medios pago' },
  { id: 'credito',  label: 'Crédito'     },
  { id: 'balance',  label: 'Balance P&L' },
];

export default function ContabilidadPage() {
  const [tab,       setTab]       = useState<Tab>('resumen');
  const [periodoIdx, setPeriodoIdx] = useState(0);
  const [ganancia,  setGanancia]  = useState<GananciaDashboard | null>(null);
  const [ventas,    setVentas]    = useState<Venta[]>([]);
  const [loading,   setLoading]   = useState(true);

  const periodo = PERIODOS[periodoIdx];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<GananciaDashboard>(`/dashboard/ganancia?periodo=mes&desde=${periodo.desde}&hasta=${periodo.hasta}`)
        .catch(() => null),
      api.get<{ data: Venta[] }>(`/ventas?fecha_desde=${periodo.desde}&fecha_hasta=${periodo.hasta}&per_page=500`)
        .then(r => r.data).catch(() => [] as Venta[]),
    ]).then(([g, v]) => {
      setGanancia(g);
      setVentas(v);
      setLoading(false);
    });
  }, [periodoIdx]);

  const datos: DatosContabilidad = { ganancia, ventas, loading, desde: periodo.desde, hasta: periodo.hasta };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center gap-4 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Contabilidad</h1>
          <p className="text-xs text-zinc-400">Medios de pago · ventas · balance</p>
        </div>
        <div className="ml-auto">
          <select
            value={periodoIdx}
            onChange={e => setPeriodoIdx(Number(e.target.value))}
            className="text-sm border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-600 bg-white focus:outline-none focus:border-[var(--brand-purple)]"
          >
            {PERIODOS.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-zinc-100 px-6 flex gap-1 shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[var(--brand-purple)] text-[var(--brand-purple)]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'resumen'  && <TabResumen  d={datos} />}
        {tab === 'medios'   && <TabMedios   d={datos} />}
        {tab === 'credito'  && <TabCredito  d={datos} />}
        {tab === 'balance'  && <TabBalance  d={datos} />}
      </div>
    </div>
  );
}
