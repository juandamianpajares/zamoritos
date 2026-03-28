'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, type VentasDia, type TopProductos, type DashboardStats, type VentasSemanaItem, type StockMovimientoItem, type GananciaDashboard } from '@/lib/api';

type Periodo = 'hoy' | 'semana' | 'mes' | 'año';

function periodoDias(p: Periodo): number {
  if (p === 'mes') return 30;
  if (p === 'año') return 365;
  return 7;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

const MEDIO_LABEL: Record<string, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'VISA',
  oca:           'OCA',
  master:        'MasterCard',
  anda:          'ANDA',
  cabal:         'CABAL',
  transferencia: 'Transf.',
  otro:          'Otro',
  sicfe:         'SICFE',
  'sin especificar': 'Sin especif.',
};

const MEDIO_COLOR: Record<string, string> = {
  efectivo:      'bg-emerald-100 text-emerald-700',
  tarjeta:       'bg-blue-100 text-blue-700',
  oca:           'bg-orange-100 text-orange-700',
  master:        'bg-orange-100 text-orange-800',
  anda:          'bg-cyan-100 text-cyan-700',
  cabal:         'bg-indigo-100 text-indigo-700',
  transferencia: 'bg-violet-100 text-violet-700',
  otro:          'bg-zinc-100 text-zinc-600',
  sicfe:         'bg-zinc-100 text-zinc-500',
  'sin especificar': 'bg-zinc-100 text-zinc-500',
};

// ─── Gráfico de barras ────────────────────────────────────────────────────────

function BarChart({ data, mode = 'ventas' }: { data: VentasSemanaItem[]; mode?: 'ventas' | 'ganancia' }) {
  // Para > 30 días, agrupar por semana/mes
  const grouped = (() => {
    if (data.length <= 30) return data.map(d => ({ ...d, label: '' }));
    // año: agrupar por mes
    const byMonth: Record<string, { total: number; ganancia_neta: number; cantidad: number; fecha: string }> = {};
    for (const d of data) {
      const key = d.fecha.slice(0, 7); // YYYY-MM
      if (!byMonth[key]) byMonth[key] = { total: 0, ganancia_neta: 0, cantidad: 0, fecha: d.fecha };
      byMonth[key].total += d.total;
      byMonth[key].ganancia_neta += d.ganancia_neta;
      byMonth[key].cantidad += d.cantidad;
    }
    return Object.entries(byMonth).map(([k, v]) => ({ ...v, label: k.slice(5) }));
  })();

  const values = grouped.map(d => mode === 'ganancia' ? d.ganancia_neta : d.total);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const dias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const [hovered, setHovered] = useState<number | null>(null);

  const showLabel = grouped.length <= 30;

  return (
    <div className="flex items-end gap-0.5 w-full px-1" style={{ height: 108 }}>
      {grouped.map((d, i) => {
        const val = mode === 'ganancia' ? d.ganancia_neta : d.total;
        const isNeg = val < 0;
        const barH = Math.max(4, Math.round((Math.abs(val) / range) * 72));
        const isToday = i === grouped.length - 1 && data.length <= 30;
        const isHov   = hovered === i;
        const diaSemana = showLabel ? (d.label || dias[new Date(d.fecha + 'T12:00:00').getDay()]) : (d.label || '');
        return (
          <div
            key={d.fecha}
            className="flex-1 flex flex-col items-center gap-1 cursor-default relative group"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Tooltip */}
            {isHov && Math.abs(val) > 0 && (
              <div className="absolute bottom-full mb-1 z-10 bg-zinc-900 text-white text-[10px] font-semibold rounded-lg px-2 py-1 whitespace-nowrap shadow-lg pointer-events-none">
                {fmt(val)}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
              </div>
            )}
            {/* Barra */}
            <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
              <div
                className="w-full rounded-t-lg transition-all duration-150"
                style={{
                  height: `${barH}px`,
                  background: isNeg
                    ? '#f43f5e'
                    : isToday
                    ? 'var(--brand-purple)'
                    : isHov
                    ? 'var(--brand-teal)'
                    : mode === 'ganancia'
                    ? 'color-mix(in srgb, #10b981 60%, white)'
                    : 'color-mix(in srgb, var(--brand-teal) 60%, white)',
                  opacity: val === 0 ? 0.15 : 1,
                  transform: isHov ? 'scaleY(1.04)' : 'scaleY(1)',
                  transformOrigin: 'bottom',
                }}
              />
            </div>
            <span className={`text-[9px] font-semibold ${isToday ? 'text-[var(--brand-purple)]' : 'text-zinc-400'}`}>
              {diaSemana}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Gráfico de stock (ingresos vs egresos) ──────────────────────────────────

function StockChart({ data }: { data: StockMovimientoItem[] }) {
  const grouped = (() => {
    if (data.length <= 30) return data;
    const byMonth: Record<string, { ingresos: number; egresos: number; fecha: string }> = {};
    for (const d of data) {
      const key = d.fecha.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { ingresos: 0, egresos: 0, fecha: d.fecha };
      byMonth[key].ingresos += d.ingresos;
      byMonth[key].egresos += d.egresos;
    }
    return Object.values(byMonth);
  })();

  const max = Math.max(...grouped.map(d => Math.max(d.ingresos, d.egresos)), 1);
  const [hovered, setHovered] = useState<number | null>(null);

  if (grouped.every(d => d.ingresos === 0 && d.egresos === 0)) {
    return <div className="h-24 flex items-center justify-center text-sm text-zinc-300">Sin movimientos</div>;
  }

  return (
    <div className="flex items-end gap-0.5 w-full px-1" style={{ height: 108 }}>
      {grouped.map((d, i) => {
        const ingH = Math.max(d.ingresos > 0 ? 4 : 0, Math.round((d.ingresos / max) * 72));
        const egH  = Math.max(d.egresos > 0 ? 4 : 0, Math.round((d.egresos / max) * 72));
        const isHov = hovered === i;
        const label = data.length > 30 ? d.fecha.slice(5, 7) : '';
        return (
          <div key={d.fecha} className="flex-1 flex flex-col items-center gap-0.5 cursor-default relative"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {isHov && (d.ingresos > 0 || d.egresos > 0) && (
              <div className="absolute bottom-full mb-1 z-10 bg-zinc-900 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap shadow-lg pointer-events-none">
                <span className="text-emerald-400">↑{Math.round(d.ingresos)}</span>
                {' · '}
                <span className="text-rose-400">↓{Math.round(d.egresos)}</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
              </div>
            )}
            <div className="w-full flex flex-col justify-end gap-px" style={{ height: 80 }}>
              <div className="flex gap-px justify-center items-end h-full">
                {ingH > 0 && <div style={{ height: ingH, background: '#10b981', opacity: isHov ? 1 : 0.7 }} className="flex-1 rounded-t-sm transition-all" />}
                {egH > 0 && <div style={{ height: egH, background: '#f43f5e', opacity: isHov ? 1 : 0.7 }} className="flex-1 rounded-t-sm transition-all" />}
              </div>
            </div>
            {label && <span className="text-[9px] text-zinc-400">{label}</span>}
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

          {/* Con / sin factura */}
          {(ventasDia.con_factura.cantidad > 0 || ventasDia.sin_factura.cantidad > 0) && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Con / sin factura</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-violet-50 rounded-xl p-3">
                  <p className="text-[10px] text-violet-400 font-semibold uppercase mb-0.5">Con factura</p>
                  <p className="text-sm font-bold text-violet-700">{fmt(ventasDia.con_factura.total)}</p>
                  <p className="text-[10px] text-violet-400">{ventasDia.con_factura.cantidad} vta{ventasDia.con_factura.cantidad !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase mb-0.5">Sin factura</p>
                  <p className="text-sm font-bold text-zinc-700">{fmt(ventasDia.sin_factura.total)}</p>
                  <p className="text-[10px] text-zinc-400">{ventasDia.sin_factura.cantidad} vta{ventasDia.sin_factura.cantidad !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          )}

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
  const [stockMovs, setStockMovs] = useState<StockMovimientoItem[]>([]);
  const [topProductos, setTopProductos] = useState<TopProductos | null>(null);
  const [alertas, setAlertas] = useState<DashboardStats | null>(null);
  const [ganancia, setGanancia] = useState<GananciaDashboard | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [graficoMode, setGraficoMode] = useState<'ventas' | 'ganancia'>('ventas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPeriodo = useCallback((p: Periodo) => {
    const dias = periodoDias(p);
    api.get<TopProductos>(`/dashboard/top-productos?periodo=${p}`).then(setTopProductos).catch(() => {});
    api.get<GananciaDashboard>(`/dashboard/ganancia?periodo=${p}`).then(setGanancia).catch(() => {});
    api.get<VentasSemanaItem[]>(`/dashboard/ventas-semana?dias=${dias}`).then(setVentasSemana).catch(() => {});
    api.get<StockMovimientoItem[]>(`/dashboard/stock-movimientos?dias=${dias}`).then(setStockMovs).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<VentasDia>('/dashboard/ventas-dia'),
      api.get<TopProductos>(`/dashboard/top-productos?periodo=${periodo}`),
      api.get<DashboardStats>('/dashboard/stats'),
      api.get<VentasSemanaItem[]>('/dashboard/ventas-semana?dias=7'),
      api.get<GananciaDashboard>(`/dashboard/ganancia?periodo=${periodo}`),
      api.get<StockMovimientoItem[]>('/dashboard/stock-movimientos?dias=7'),
    ])
      .then(([v, t, s, sem, g, sm]) => {
        setVentasDia(v); setTopProductos(t); setAlertas(s);
        setVentasSemana(sem as VentasSemanaItem[]);
        setGanancia(g);
        setStockMovs(sm as StockMovimientoItem[]);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPeriodo(periodo); }, [periodo, loadPeriodo]);

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

  const ayerTotal  = ventasSemana[ventasSemana.length - 2]?.total ?? 0;
  const deltaVsAyer: number | null = periodo === 'hoy' && ayerTotal > 0
    ? Math.round(((ventasSemana[ventasSemana.length - 1]?.total ?? 0) - ayerTotal) / ayerTotal * 100)
    : null;

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-6 overflow-y-auto flex-1">

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
          <Link
            href="/caja"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--brand-purple)' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="1" y="4" width="22" height="16" rx="2"/><circle cx="12" cy="12" r="3"/>
              <line x1="5" y1="12" x2="5.01" y2="12" strokeWidth="3"/><line x1="19" y1="12" x2="19.01" y2="12" strokeWidth="3"/>
            </svg>
            Cierre de caja
          </Link>
        </div>
      </div>

      {/* ── Panel 1: KPIs + Gráfico ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            {periodo === 'hoy' ? 'Ventas del día' : periodo === 'semana' ? 'Última semana' : periodo === 'mes' ? 'Último mes' : 'Último año'}
          </h2>
          <div className="flex gap-1 bg-zinc-100 p-0.5 rounded-xl">
            {(['hoy', 'semana', 'mes', 'año'] as Periodo[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  periodo === p ? 'text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
                style={periodo === p ? { background: 'var(--brand-purple)' } : {}}
              >
                {p === 'hoy' ? 'Hoy' : p === 'semana' ? '7d' : p === 'mes' ? '30d' : '365d'}
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
            delta={deltaVsAyer}
          />
          <KpiCard
            label="Total compras"
            value={fmt(ganancia?.total_compras ?? 0)}
            sub="egresos del período"
            accent="text-rose-600"
          />
          <KpiCard
            label="Ganancia neta"
            value={fmt(ganancia?.ganancia_neta ?? 0)}
            sub={ganancia ? `${ganancia.margen_pct}% sobre ventas` : undefined}
            accent={(ganancia?.ganancia_neta ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          />
          <KpiCard
            label="Stock bajo"
            value={String(alertas?.stock_bajo_count ?? 0)}
            sub="productos ≤ mínimo"
            accent={(alertas?.stock_bajo_count ?? 0) > 0 ? 'text-rose-600' : 'text-zinc-800'}
          />
        </div>

        {/* Gráfico + desglose */}
        <div className="grid lg:grid-cols-2 gap-3">

          {/* Gráfico ventas/ganancia */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                {graficoMode === 'ventas' ? 'Ventas' : 'Ganancia neta'}
              </p>
              <div className="flex gap-1 bg-zinc-100 p-0.5 rounded-lg">
                <button onClick={() => setGraficoMode('ventas')}
                  className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${graficoMode === 'ventas' ? 'bg-white text-zinc-700 shadow-sm' : 'text-zinc-400'}`}>
                  Ventas
                </button>
                <button onClick={() => setGraficoMode('ganancia')}
                  className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${graficoMode === 'ganancia' ? 'bg-white text-emerald-700 shadow-sm' : 'text-zinc-400'}`}>
                  Ganancia
                </button>
              </div>
            </div>
            {ventasSemana.length > 0 && (
              <p className="text-xs text-zinc-400 tabular-nums mb-3">
                Total: <strong className={graficoMode === 'ganancia' ? ((ganancia?.ganancia_neta ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-zinc-700'}>
                  {fmt(graficoMode === 'ganancia'
                    ? ventasSemana.reduce((s, d) => s + d.ganancia_neta, 0)
                    : ventasSemana.reduce((s, d) => s + d.total, 0)
                  )}
                </strong>
              </p>
            )}
            {ventasSemana.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-sm text-zinc-300">Sin datos</div>
            ) : (
              <BarChart data={ventasSemana} mode={graficoMode} />
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

            {/* Desglose con / sin factura */}
            {ventasDia && (ventasDia.con_factura.cantidad > 0 || ventasDia.sin_factura.cantidad > 0) && (
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Con / sin factura</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-violet-50 rounded-xl p-3">
                    <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-0.5">Con factura</p>
                    <p className="text-sm font-bold text-violet-700">{fmt(ventasDia.con_factura.total)}</p>
                    <p className="text-[10px] text-violet-400">{ventasDia.con_factura.cantidad} vta{ventasDia.con_factura.cantidad !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-0.5">Sin factura</p>
                    <p className="text-sm font-bold text-zinc-700">{fmt(ventasDia.sin_factura.total)}</p>
                    <p className="text-[10px] text-zinc-400">{ventasDia.sin_factura.cantidad} vta{ventasDia.sin_factura.cantidad !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Panel 1b: Stock movimientos ── */}
      <section>
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Movimientos de stock</p>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />Ingresos</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />Egresos</span>
            </div>
          </div>
          <StockChart data={stockMovs} />
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
              {[...ventasDia.ventas].reverse().slice(0, 6).map(v => (
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


    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, bar, delta }: {
  label: string; value: string; sub?: string; accent: string; bar?: boolean; delta?: number | null;
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
      <div className="flex items-end gap-2">
        <p className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</p>
        {delta != null && (
          <span
            title="vs ayer"
            className={`mb-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full cursor-default ${
              delta > 0  ? 'bg-emerald-50 text-emerald-600' :
              delta < 0  ? 'bg-rose-50 text-rose-600' :
                           'bg-zinc-100 text-zinc-500'
            }`}
          >
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}
