'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type VentasDia, type TopProductos, type DashboardStats } from '@/lib/api';

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [ventasDia, setVentasDia] = useState<VentasDia | null>(null);
  const [topProductos, setTopProductos] = useState<TopProductos | null>(null);
  const [alertas, setAlertas] = useState<DashboardStats | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTop = useCallback((p: Periodo) => {
    api.get<TopProductos>(`/dashboard/top-productos?periodo=${p}`)
      .then(setTopProductos)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<VentasDia>('/dashboard/ventas-dia'),
      api.get<TopProductos>(`/dashboard/top-productos?periodo=${periodo}`),
      api.get<DashboardStats>('/dashboard/stats'),
    ])
      .then(([v, t, s]) => { setVentasDia(v); setTopProductos(t); setAlertas(s); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTop(periodo); }, [periodo, loadTop]);

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
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Panel 1: Ventas del día + cierre de caja ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Ventas del día · cierre de caja
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard
            label="Total del día"
            value={fmt(ventasDia?.total ?? 0)}
            sub={`${ventasDia?.cantidad ?? 0} ventas`}
            accent="text-[#7B2D8B]"
            bar
          />
          <KpiCard
            label="Ticket promedio"
            value={fmt(ventasDia?.ticket_promedio ?? 0)}
            accent="text-zinc-800"
          />
          <KpiCard
            label="Stock bajo"
            value={String(alertas?.stock_bajo_count ?? 0)}
            sub="productos ≤ 5 uds."
            accent={(alertas?.stock_bajo_count ?? 0) > 0 ? 'text-rose-600' : 'text-zinc-800'}
          />
          <KpiCard
            label="Próx. a vencer"
            value={String(alertas?.proximos_vencer_count ?? 0)}
            sub="en 30 días"
            accent={(alertas?.proximos_vencer_count ?? 0) > 0 ? 'text-amber-500' : 'text-zinc-800'}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          {/* Desglose por medio de pago */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-4">
              Desglose por medio de pago
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

          {/* Últimas ventas del día */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-4">
              Últimas ventas del día
            </p>
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
        </div>
      </section>

      {/* ── Panel 2: Productos más vendidos ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Productos más vendidos
          </h2>
          <div className="flex gap-1 bg-zinc-100 p-0.5 rounded-xl">
            {(['hoy', 'semana', 'mes'] as Periodo[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  periodo === p
                    ? 'text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
                style={periodo === p ? { background: 'var(--brand-purple)' } : {}}
              >
                {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {!topProductos?.top.length ? (
            <div className="py-12 text-center text-sm text-zinc-300">
              Sin ventas en el período seleccionado
            </div>
          ) : (
            <>
              {/* Header */}
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
