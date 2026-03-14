'use client';

import { useEffect, useState } from 'react';
import { api, type Lote, type Producto } from '@/lib/api';

function diasBadge(fecha: string | undefined) {
  if (!fecha) return null;
  const days = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  const cls = days < 0
    ? 'bg-rose-100 text-rose-700'
    : days <= 7
    ? 'bg-rose-50 text-rose-600'
    : days <= 30
    ? 'bg-amber-50 text-amber-600'
    : 'bg-emerald-50 text-emerald-700';
  const label = days < 0 ? 'Vencido' : `${days}d`;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
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
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Lotes y Vencimientos</h1>
        <p className="text-sm text-zinc-400 mt-0.5">{lotes.length} lotes</p>
      </div>

      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)}
          className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white w-56">
          <option value="">Todos los productos</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer select-none">
          <div
            onClick={() => setSoloVencer(v => !v)}
            className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative ${soloVencer ? 'bg-zinc-900' : 'bg-zinc-200'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${soloVencer ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </div>
          Solo próximos a vencer (30 días)
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  {['#', 'Producto', 'Compra', 'Ingreso', 'Vencimiento', 'Estado', 'Cantidad', 'Restante'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lotes.map(l => (
                  <tr key={l.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{l.id}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{l.producto?.nombre}</td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{l.compra_id ? `#${l.compra_id}` : '—'}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(l.fecha_ingreso).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs tabular-nums">{l.fecha_vencimiento ?? <span className="text-zinc-300">—</span>}</td>
                    <td className="px-4 py-3">{diasBadge(l.fecha_vencimiento)}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-600">{l.cantidad}</td>
                    <td className={`px-4 py-3 font-semibold tabular-nums ${l.cantidad_restante === 0 ? 'text-zinc-300' : 'text-zinc-800'}`}>
                      {l.cantidad_restante}
                    </td>
                  </tr>
                ))}
                {lotes.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-zinc-400">Sin lotes registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
