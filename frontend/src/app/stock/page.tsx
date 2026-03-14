'use client';

import { useEffect, useState } from 'react';
import { api, type MovimientoStock, type Producto } from '@/lib/api';
import Modal from '@/components/Modal';

const tipoColor: Record<string, string> = {
  ingreso:     'bg-green-100 text-green-700',
  venta:       'bg-blue-100 text-blue-700',
  venta_suelta:'bg-indigo-100 text-indigo-700',
  ajuste:      'bg-yellow-100 text-yellow-700',
  vencimiento: 'bg-red-100 text-red-700',
};

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
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Movimientos de Stock</h1>
        <button onClick={() => { setForm({ producto_id: '', cantidad: '', observacion: '' }); setError(''); setModalOpen(true); }}
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 text-sm">
          Ajuste manual
        </button>
      </div>

      <div className="mb-4">
        <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los productos</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Referencia', 'Observación'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.fecha).toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3 font-medium">{m.producto?.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColor[m.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                      {m.tipo.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${m.cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{m.referencia ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{m.observacion ?? '-'}</td>
                </tr>
              ))}
              {movimientos.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Sin movimientos</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal ajuste */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Ajuste manual de stock" size="sm">
        <form onSubmit={handleAjuste} className="space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Producto *</label>
            <select required value={form.producto_id} onChange={e => setForm(p => ({ ...p, producto_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar producto</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock} {p.unidad_medida})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad * <span className="text-gray-400 font-normal">(negativo para reducir)</span>
            </label>
            <input required type="number" step="0.001" value={form.cantidad}
              onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: -5 o +10" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observación</label>
            <input value={form.observacion} onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Motivo del ajuste" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">Cancelar</button>
            <button type="submit"
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm">Aplicar ajuste</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
