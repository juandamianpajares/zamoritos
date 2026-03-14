'use client';

import { useEffect, useState } from 'react';
import { api, type DashboardStats } from '@/lib/api';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`bg-white rounded-xl shadow p-6 border-l-4 ${color}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
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

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!stats) return <div className="p-8 text-gray-400">Cargando dashboard...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Productos activos"  value={stats.total_productos}      color="border-blue-500" />
        <StatCard label="Proveedores"        value={stats.total_proveedores}    color="border-green-500" />
        <StatCard label="Compras registradas" value={stats.total_compras}       color="border-purple-500" />
        <StatCard label="Stock bajo (≤5)"    value={stats.stock_bajo_count}     color="border-red-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Stock bajo */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="text-red-500">⚠️</span> Productos con stock bajo
          </h2>
          {stats.productos_stock_bajo.length === 0 ? (
            <p className="text-gray-400 text-sm">Ningún producto con stock bajo.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 text-right">Stock</th>
                  <th className="pb-2 text-right">Unidad</th>
                </tr>
              </thead>
              <tbody>
                {stats.productos_stock_bajo.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">{p.nombre}</td>
                    <td className={`py-2 text-right font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                      {p.stock}
                    </td>
                    <td className="py-2 text-right text-gray-400">{p.unidad_medida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Próximos a vencer */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>⏰</span> Próximos a vencer (30 días)
          </h2>
          {stats.proximos_vencer.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay lotes próximos a vencer.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2">Vence</th>
                  <th className="pb-2 text-right">Cant.</th>
                </tr>
              </thead>
              <tbody>
                {stats.proximos_vencer.map(l => {
                  const days = Math.ceil(
                    (new Date(l.fecha_vencimiento!).getTime() - Date.now()) / 86400000
                  );
                  return (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2">{l.producto?.nombre}</td>
                      <td className={`py-2 text-sm ${days <= 7 ? 'text-red-600 font-semibold' : 'text-orange-500'}`}>
                        {l.fecha_vencimiento} ({days}d)
                      </td>
                      <td className="py-2 text-right">{l.cantidad_restante}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
