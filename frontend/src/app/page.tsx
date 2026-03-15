'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type VentasDia, type TopProductos, type DashboardStats, type VentasSemanaItem, type GananciaDashboard } from '@/lib/api';

type Periodo = 'hoy' | 'semana' | 'mes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${n.toLocaleString('es-CL', { minimumFractionDigits: 0 })}`;
}

const MEDIO_LABEL: Record<string, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  oca:           'OCA',
  transferencia: 'Transf.',
  otro:          'Otro',
  'sin especificar': 'Sin especif.',
};

const MEDIO_COLOR: Record<string, string> = {
  efectivo:      'bg-emerald-100 text-emerald-700',
  tarjeta:       'bg-blue-100 text-blue-700',
  oca:           'bg-orange-100 text-orange-700',
  transferencia: 'bg-violet-100 text-violet-700',
  otro:          'bg-zinc-100 text-zinc-600',
  'sin especificar': 'bg-zinc-100 text-zinc-500',
};

// ─── Gráfico de barras (7 días) ───────────────────────────────────────────────

function BarChart({ data }: { data: VentasSemanaItem[] }) {
  const max = Math.max(...data.map(d => d.total), 1);
  const dias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  return (
    <div className="flex items-end gap-1.5 h-24 w-full px-1">
      {data.map((d, i) => {
        const pct = Math.max(4, Math.round((d.total / max) * 88));
        const isToday = i === data.length - 1;
        const diaSemana = dias[new Date(d.fecha + 'T12:00:00').getDay()];
        return (
          <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1" title={`${d.fecha}: ${fmt(d.total)}`}>
            <div className="w-full flex flex-col justify-end" style={{ height: 88 }}>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${pct}px`,
                  background: isToday ? 'var(--brand-purple)' : 'var(--brand-teal)',
                  opacity: d.total === 0 ? 0.18 : 1,
                }}
              />
            </div>
            <span className={`text-[9px] font-medium ${isToday ? 'text-[var(--brand-purple)]' : 'text-zinc-400'}`}>
              {diaSemana}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Modal Cierre de Caja ─────────────────────────────────────────────────────

function CierreCajaModal({ ventasDia, onClose }: { ventasDia: VentasDia; onClose: () => void }) {
  const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Cierre de caja</h2>
              <p className="text-xs text-zinc-400 mt-0.5 capitalize">{fecha}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="15" y2="15"/><line x1="15" y1="1" x2="1" y2="15"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className="px-6 py-5 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Ventas</p>
              <p className="text-xl font-bold text-zinc-900">{ventasDia.cantidad}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Ticket prom.</p>
              <p className="text-base font-bold text-zinc-900">{fmt(ventasDia.ticket_promedio)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Total</p>
              <p className="text-base font-bold" style={{ color: 'var(--brand-purple)' }}>{fmt(ventasDia.total)}</p>
            </div>
          </div>

          {/* Desglose medio de pago */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Desglose por medio</p>
            {ventasDia.por_medio_pago.length === 0 ? (
              <p className="text-sm text-zinc-300 text-center py-4">Sin ventas registradas hoy</p>
            ) : (
              <div className="space-y-2">
                {ventasDia.por_medio_pago.map(m => (
                  <div key={m.medio} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEDIO_COLOR[m.medio] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {MEDIO_LABEL[m.medio] ?? m.medio}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-zinc-900">{fmt(m.total)}</span>
                      <span className="text-xs text-zinc-400 ml-1.5">{m.cantidad} vta{m.cantidad !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total final */}
          <div className="bg-zinc-950 rounded-2xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide">Total del día</p>
              <p className="text-2xl font-bold text-white mt-0.5">{fmt(ventasDia.total)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="1" y="4" width="22" height="16" rx="2"/><circle cx="12" cy="12" r="3"/>
                <line x1="5" y1="12" x2="5.01" y2="12" strokeWidth="3"/><line x1="19" y1="12" x2="19.01" y2="12" strokeWidth="3"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-zinc-200 rounded-2xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'var(--brand-purple)' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [ventasDia, setVentasDia] = useState<VentasDia | null>(null);
  const [ventasSemana, setVentasSemana] = useState<VentasSemanaItem[]>([]);
  const [topProductos, setTopProductos] = useState<TopProductos | null>(null);
  const [alertas, setAlertas] = useState<DashboardStats | null>(null);
  const [ganancia, setGanancia] = useState<GananciaDashboard | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cierreOpen, setCierreOpen] = useState(false);

  const loadTop = useCallback((p: Periodo) => {
    api.get<TopProductos>(`/dashboard/top-productos?periodo=${p}`)
      .then(setTopProductos)
      .catch(() => {});
  }, []);

  const loadGanancia = useCallback((p: Periodo) => {
    api.get<GananciaDashboard>(`/dashboard/ganancia?periodo=${p}`)
      .then(setGanancia)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<VentasDia>('/dashboard/ventas-dia'),
      api.get<TopProductos>(`/dashboard/top-productos?periodo=${periodo}`),
      api.get<DashboardStats>('/dashboard/stats'),
      api.get<VentasSemanaItem[]>('/dashboard/ventas-semana'),
      api.get<GananciaDashboard>(`/dashboard/ganancia?periodo=${periodo}`),
    ])
      .then(([v, t, s, sem, g]) => { setVentasDia(v); setTopProductos(t); setAlertas(s); setVentasSemana(sem); setGanancia(g); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTop(periodo); loadGanancia(periodo); }, [periodo, loadTop, loadGanancia]);

  if (error) return (
    <div className="p-8">
      <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-2xl border border-rose-100">{error}</div>
    </div>
  );

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-sm text-zinc-400">
      <div className="w-4 h-4 border-2 border-zinc-300 border-t-[#7B2D8B] rounded-full animate-spin" />
      Cargando...
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/ventas"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 transition-all active:scale-95"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Nueva venta
          </a>
          <button
            onClick={() => setCierreOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--brand-purple)' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="1" y="4" width="22" height="16" rx="2"/><circle cx="12" cy="12" r="3"/>
              <line x1="5" y1="12" x2="5.01" y2="12" strokeWidth="3"/><line x1="19" y1="12" x2="19.01" y2="12" strokeWidth="3"/>
            </svg>
            Cierre de caja
          </button>
        </div>
      </div>

      {/* ── Panel 1: KPIs + Gráfico ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            {periodo === 'hoy' ? 'Ventas del día' : periodo === 'semana' ? 'Ventas de la semana' : 'Ventas del mes'}
          </h2>
          <div className="flex gap-1 bg-zinc-100 p-0.5 rounded-xl">
            {(['hoy', 'semana', 'mes'] as Periodo[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  periodo === p ? 'text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
                style={periodo === p ? { background: 'var(--brand-purple)' } : {}}
              >
                {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard
            label="Total ventas"
            value={fmt(periodo === 'hoy' ? (ventasDia?.total ?? 0) : (ganancia?.total_ventas ?? 0))}
            sub={periodo === 'hoy' ? `${ventasDia?.cantidad ?? 0} ventas` : undefined}
            accent="text-[#7B2D8B]"
            bar
          />
          <KpiCard
            label="Ticket promedio"
            value={fmt(ventasDia?.ticket_promedio ?? 0)}
            sub="hoy"
            accent="text-zinc-800"
          />
          <KpiCard
            label="Ganancia neta"
            value={fmt(ganancia?.ganancia_neta ?? 0)}
            sub={ganancia ? `${ganancia.margen_pct}% margen` : undefined}
            accent={(ganancia?.ganancia_neta ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          />
          <KpiCard
            label="Stock bajo"
            value={String(alertas?.stock_bajo_count ?? 0)}
            sub="productos ≤ 5 uds."
            accent={(alertas?.stock_bajo_count ?? 0) > 0 ? 'text-rose-600' : 'text-zinc-800'}
          />
        </div>

        {/* Gráfico + desglose */}
        <div className="grid lg:grid-cols-2 gap-3">

          {/* Gráfico 7 días */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Ventas últimos 7 días
              </p>
              {ventasSemana.length > 0 && (
                <p className="text-xs text-zinc-400 tabular-nums">
                  Total: <strong className="text-zinc-700">{fmt(ventasSemana.reduce((s, d) => s + d.total, 0))}</strong>
                </p>
              )}
            </div>
            {ventasSemana.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-sm text-zinc-300">Sin datos</div>
            ) : (
              <BarChart data={ventasSemana} />
            )}
          </div>

          {/* Desglose por medio de pago */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-4">
              Desglose por medio de pago — hoy
            </p>
            {!ventasDia?.por_medio_pago.length ? (
              <p className="text-sm text-zinc-300 text-center py-6">Sin ventas hoy</p>
            ) : (
              <div className="space-y-2">
                {ventasDia.por_medio_pago.map(m => {
                  const pct = ventasDia.total > 0
                    ? Math.round((m.total / ventasDia.total) * 100)
                    : 0;
                  return (
                    <div key={m.medio}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEDIO_COLOR[m.medio] ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {MEDIO_LABEL[m.medio] ?? m.medio}
                          </span>
                          <span className="text-xs text-zinc-400">{m.cantidad} vta{m.cantidad !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-zinc-800">{fmt(m.total)}</span>
                          <span className="text-xs text-zinc-400 ml-1.5">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: 'var(--brand-teal)' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Panel 2: Últimas ventas del día ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Últimas ventas del día</h2>
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          {!ventasDia?.ventas.length ? (
            <p className="text-sm text-zinc-300 text-center py-6">Sin ventas registradas hoy</p>
          ) : (
            <div className="space-y-0">
              {ventasDia.ventas.slice(0, 6).map(v => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-mono w-8">#{v.id}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${MEDIO_COLOR[v.medio_pago ?? ''] ?? 'bg-zinc-100 text-zinc-500'}`}>
                      {MEDIO_LABEL[v.medio_pago ?? ''] ?? v.medio_pago ?? '—'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-800 tabular-nums">{fmt(v.total)}</span>
                </div>
              ))}
              {ventasDia.ventas.length > 6 && (
                <p className="text-xs text-zinc-400 text-center pt-2">
                  +{ventasDia.ventas.length - 6} ventas más
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Panel 3: Productos más vendidos ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Productos más vendidos
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {!topProductos?.top.length ? (
            <div className="py-12 text-center text-sm text-zinc-300">
              Sin ventas en el período seleccionado
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-zinc-50">
                <span className="col-span-1 text-xs font-medium text-zinc-400 uppercase tracking-wide">#</span>
                <span className="col-span-5 text-xs font-medium text-zinc-400 uppercase tracking-wide">Producto</span>
                <span className="col-span-2 text-xs font-medium text-zinc-400 uppercase tracking-wide text-right">Unidades</span>
                <span className="col-span-4 text-xs font-medium text-zinc-400 uppercase tracking-wide text-right">Ingresos</span>
              </div>
              {topProductos.top.map((p, i) => {
                const maxUnidades = topProductos.top[0]?.total_unidades ?? 1;
                const pct = Math.round((p.total_unidades / maxUnidades) * 100);
                return (
                  <div key={p.producto_id} className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-zinc-50 last:border-0 items-center hover:bg-zinc-50/50 transition-colors">
                    <span className="col-span-1 text-xs font-bold text-zinc-300">{i + 1}</span>
                    <div className="col-span-5">
                      <p className="text-sm font-medium text-zinc-800 leading-tight">{p.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.categoria && (
                          <span className="text-[10px] text-zinc-400">{p.categoria}</span>
                        )}
                        <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden max-w-24">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: 'var(--brand-teal)' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-semibold text-zinc-700 tabular-nums">{p.total_unidades}</span>
                      <span className="text-[10px] text-zinc-400 ml-1">{p.unidad_medida}</span>
                    </div>
                    <div className="col-span-4 text-right">
                      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--brand-purple)' }}>
                        {fmt(p.total_ingresos)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>

      {/* ── Panel 4: Ganancia x Proveedor ── */}
      {ganancia && ganancia.por_proveedor.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            % Ganancia por proveedor
          </h2>
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-zinc-50">
              <span className="col-span-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Proveedor</span>
              <span className="col-span-3 text-xs font-medium text-zinc-400 uppercase tracking-wide text-right">Ventas</span>
              <span className="col-span-3 text-xs font-medium text-zinc-400 uppercase tracking-wide text-right">Ganancia</span>
              <span className="col-span-2 text-xs font-medium text-zinc-400 uppercase tracking-wide text-right">Margen</span>
            </div>
            {ganancia.por_proveedor.map((p) => (
              <div key={p.proveedor} className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-zinc-50 last:border-0 items-center hover:bg-zinc-50/50 transition-colors">
                <div className="col-span-4">
                  <p className="text-sm font-medium text-zinc-800 truncate">{p.proveedor}</p>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-1 max-w-32">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(4, p.margen_pct)}%`, background: p.margen_pct >= 0 ? 'var(--brand-teal)' : '#f43f5e' }}
                    />
                  </div>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm font-semibold text-zinc-700 tabular-nums">{fmt(p.total_ventas)}</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className={`text-sm font-semibold tabular-nums ${p.ganancia >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {fmt(p.ganancia)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.margen_pct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {p.margen_pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Alertas ── */}
      {((alertas?.stock_bajo_count ?? 0) > 0 || (alertas?.proximos_vencer_count ?? 0) > 0) && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Alertas</h2>
          <div className="grid lg:grid-cols-2 gap-3">
            {(alertas?.stock_bajo_count ?? 0) > 0 && (
              <div className="bg-white rounded-2xl border border-rose-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Stock bajo</p>
                </div>
                <div className="space-y-1">
                  {alertas!.productos_stock_bajo.slice(0, 5).map(p => (
                    <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-zinc-50 last:border-0">
                      <span className="text-sm text-zinc-700">{p.nombre}</span>
                      <span className={`text-sm font-bold tabular-nums ${p.stock === 0 ? 'text-rose-600' : 'text-amber-500'}`}>
                        {p.stock} <span className="text-xs font-normal text-zinc-400">{p.unidad_medida}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(alertas?.proximos_vencer_count ?? 0) > 0 && (
              <div className="bg-white rounded-2xl border border-amber-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Próximos a vencer</p>
                </div>
                <div className="space-y-1">
                  {alertas!.proximos_vencer.slice(0, 5).map(l => {
                    const days = Math.ceil((new Date(l.fecha_vencimiento!).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={l.id} className="flex justify-between items-center py-1.5 border-b border-zinc-50 last:border-0">
                        <span className="text-sm text-zinc-700">{l.producto?.nombre}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${days <= 7 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                          {days}d
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modal cierre de caja */}
      {cierreOpen && ventasDia && (
        <CierreCajaModal ventasDia={ventasDia} onClose={() => setCierreOpen(false)} />
      )}

    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, bar }: {
  label: string; value: string; sub?: string; accent: string; bar?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-5 relative overflow-hidden">
      {bar && (
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, var(--brand-purple), var(--brand-teal))' }}
        />
      )}
      <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}
