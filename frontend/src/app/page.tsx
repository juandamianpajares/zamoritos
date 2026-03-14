'use client';

import { useEffect, useState } from 'react';
import { api, type DashboardStats } from '@/lib/api';

function StatCard({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-5">
      <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-3">{label}</p>
      <p className={`text-3xl font-semibold tracking-tight ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<DashboardStats>('/dashboard/stats')
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return (
    <div className="p-8">
      <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl border border-rose-100">{error}</div>
    </div>
  );

  if (!stats) return (
    <div className="p-8 flex items-center gap-2 text-sm text-zinc-400">
      <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
      Cargando...
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Productos" value={stats.total_productos} sub="activos" accent="text-zinc-900" />
        <StatCard label="Proveedores" value={stats.total_proveedores} accent="text-zinc-900" />
        <StatCard label="Compras" value={stats.total_compras} sub="registradas" accent="text-zinc-900" />
        <StatCard label="Stock bajo" value={stats.stock_bajo_count} sub="≤ 5 unidades" accent={stats.stock_bajo_count > 0 ? 'text-rose-600' : 'text-zinc-900'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Stock bajo */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <h2 className="text-sm font-medium text-zinc-700">Productos con stock bajo</h2>
          </div>
          {stats.productos_stock_bajo.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 text-center">Todo el stock está en orden</p>
          ) : (
            <div className="space-y-1">
              {stats.productos_stock_bajo.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <span className="text-sm text-zinc-700">{p.nombre}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold tabular-nums ${p.stock === 0 ? 'text-rose-600' : 'text-amber-500'}`}>
                      {p.stock}
                    </span>
                    <span className="text-xs text-zinc-400">{p.unidad_medida}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos a vencer */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <h2 className="text-sm font-medium text-zinc-700">Próximos a vencer (30 días)</h2>
          </div>
          {stats.proximos_vencer.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 text-center">No hay lotes próximos a vencer</p>
          ) : (
            <div className="space-y-1">
              {stats.proximos_vencer.map(l => {
                const days = Math.ceil(
                  (new Date(l.fecha_vencimiento!).getTime() - Date.now()) / 86400000
                );
                return (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                    <span className="text-sm text-zinc-700">{l.producto?.nombre}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs tabular-nums font-medium px-2 py-0.5 rounded-full ${
                        days <= 7 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {days}d
                      </span>
                      <span className="text-xs text-zinc-400">{l.cantidad_restante} uds.</span>
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
