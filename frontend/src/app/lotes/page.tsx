'use client';

import { useEffect, useState } from 'react';
import { api, type Lote, type Producto } from '@/lib/api';

function vencimientoColor(fecha: string | undefined): string {
  if (!fecha) return 'text-gray-400';
  const days = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'text-red-600 font-semibold';
  if (days <= 7) return 'text-red-500 font-semibold';
  if (days <= 30) return 'text-orange-500';
  return 'text-green-600';
}

export default function LotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProducto, setFiltroProducto] = useState('');
  const [soloVencer, setSoloVencer] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroProducto) params.set('producto_id', filtroProducto);
    if (soloVencer) params.set('proximos_a_vencer', 'true');
    Promise.all([
      api.get<Lote[]>(`/lotes?${params}`),
      api.get<Producto[]>('/productos'),
    ]).then(([l, p]) => { setLotes(l); setProductos(p); setLoading(false); });
  };

  useEffect(() => { load(); }, [filtroProducto, soloVencer]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Lotes y Vencimientos</h1>

      <div className="flex gap-3 mb-4 items-center">
        <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los productos</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={soloVencer} onChange={e => setSoloVencer(e.target.checked)}
            className="rounded" />
          Solo próximos a vencer (30 días)
        </label>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['#', 'Producto', 'Compra', 'Fecha ingreso', 'Vencimiento', 'Cantidad', 'Restante'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lotes.map(l => {
                const dias = l.fecha_vencimiento
                  ? Math.ceil((new Date(l.fecha_vencimiento).getTime() - Date.now()) / 86400000)
                  : null;
                return (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{l.id}</td>
                    <td className="px-4 py-3 font-medium">{l.producto?.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{l.compra_id ? `#${l.compra_id}` : '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(l.fecha_ingreso).toLocaleDateString('es-CL')}</td>
                    <td className={`px-4 py-3 ${vencimientoColor(l.fecha_vencimiento)}`}>
                      {l.fecha_vencimiento ? (
                        <span title={dias !== null ? `${dias} días` : ''}>
                          {l.fecha_vencimiento}
                          {dias !== null && (
                            <span className="ml-1 text-xs">
                              {dias < 0 ? '(vencido)' : `(${dias}d)`}
                            </span>
                          )}
                        </span>
                      ) : <span className="text-gray-400">Sin vencimiento</span>}
                    </td>
                    <td className="px-4 py-3">{l.cantidad}</td>
                    <td className={`px-4 py-3 font-semibold ${l.cantidad_restante === 0 ? 'text-gray-400' : ''}`}>
                      {l.cantidad_restante}
                    </td>
                  </tr>
                );
              })}
              {lotes.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Sin lotes registrados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
