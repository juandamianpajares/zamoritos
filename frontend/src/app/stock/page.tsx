'use client';

import { useEffect, useState } from 'react';
import { api, type MovimientoStock, type Producto } from '@/lib/api';
import Modal from '@/components/Modal';

const tipoBadge: Record<string, string> = {
  ingreso:      'bg-emerald-50 text-emerald-700',
  venta:        'bg-sky-50 text-sky-700',
  venta_suelta: 'bg-violet-50 text-violet-700',
  ajuste:       'bg-amber-50 text-amber-700',
  vencimiento:  'bg-rose-50 text-rose-700',
};

const input = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';
const label = 'block text-xs font-medium text-zinc-500 mb-1.5';

export default function StockPage() {
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProducto, setFiltroProducto] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ producto_id: '', cantidad: '', observacion: '' });

  const load = () => {
    setLoading(true);
    const params = filtroProducto ? `?producto_id=${filtroProducto}` : '';
    Promise.all([
      api.get<MovimientoStock[]>(`/stock/movimientos${params}`),
      api.get<Producto[]>('/productos'),
    ]).then(([m, p]) => { setMovimientos(m); setProductos(p); setLoading(false); });
  };

  useEffect(() => { load(); }, [filtroProducto]);

  const handleAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/stock/ajuste', {
        producto_id: Number(form.producto_id),
        cantidad: Number(form.cantidad),
        observacion: form.observacion || null,
      });
      setModalOpen(false);
      setForm({ producto_id: '', cantidad: '', observacion: '' });
      load();
    } catch (e: unknown) { setError((e as Error).message); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Movimientos de Stock</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{movimientos.length} movimientos</p>
        </div>
        <button onClick={() => { setForm({ producto_id: '', cantidad: '', observacion: '' }); setError(''); setModalOpen(true); }}
          className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
          Ajuste manual
        </button>
      </div>

      <div className="mb-4">
        <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)}
          className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white w-64">
          <option value="">Todos los productos</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
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
                  {['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Referencia', 'Observación'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientos.map(m => (
                  <tr key={m.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 text-xs tabular-nums">{new Date(m.fecha).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{m.producto?.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadge[m.tipo] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {m.tipo.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold tabular-nums ${m.cantidad > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{m.referencia ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{m.observacion ?? '—'}</td>
                  </tr>
                ))}
                {movimientos.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-400">Sin movimientos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Ajuste manual de stock" size="sm">
        <form onSubmit={handleAjuste} className="space-y-4">
          {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}

          <div>
            <label className={label}>Producto *</label>
            <select required value={form.producto_id} onChange={e => setForm(p => ({ ...p, producto_id: e.target.value }))} className={input}>
              <option value="">Seleccionar producto</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock} {p.unidad_medida})</option>)}
            </select>
          </div>

          <div>
            <label className={label}>
              Cantidad * <span className="text-zinc-400 font-normal">(negativo para reducir)</span>
            </label>
            <input required type="number" step="0.001" value={form.cantidad}
              onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))}
              className={input} placeholder="Ej: −5 o +10" />
          </div>

          <div>
            <label className={label}>Observación</label>
            <input value={form.observacion} onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))}
              className={input} placeholder="Motivo del ajuste" />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
            <button type="submit"
              className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors">Aplicar ajuste</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
