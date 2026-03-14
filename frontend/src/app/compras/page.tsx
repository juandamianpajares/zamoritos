'use client';

import { useEffect, useState } from 'react';
import { api, type Compra, type Proveedor, type Producto } from '@/lib/api';
import Modal from '@/components/Modal';

interface DetalleLine {
  producto_id: string;
  cantidad: string;
  precio_compra: string;
  fecha_vencimiento: string;
}

const emptyLine = (): DetalleLine => ({ producto_id: '', cantidad: '', precio_compra: '', fecha_vencimiento: '' });

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<Compra | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    proveedor_id: '', fecha: new Date().toISOString().slice(0, 10), factura: '', usuario: '',
  });
  const [lineas, setLineas] = useState<DetalleLine[]>([emptyLine()]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Compra[]>('/compras'),
      api.get<Proveedor[]>('/proveedores'),
      api.get<Producto[]>('/productos'),
    ]).then(([c, p, pr]) => { setCompras(c); setProveedores(p); setProductos(pr); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const total = lineas.reduce((s, l) => {
    const c = parseFloat(l.cantidad) || 0;
    const p = parseFloat(l.precio_compra) || 0;
    return s + c * p;
  }, 0);

  const addLinea = () => setLineas(prev => [...prev, emptyLine()]);
  const removeLinea = (i: number) => setLineas(prev => prev.filter((_, idx) => idx !== i));
  const updateLinea = (i: number, k: keyof DetalleLine, v: string) =>
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const detalles = lineas.map(l => ({
      producto_id: Number(l.producto_id),
      cantidad: Number(l.cantidad),
      precio_compra: Number(l.precio_compra),
      fecha_vencimiento: l.fecha_vencimiento || null,
    }));
    try {
      await api.post('/compras', {
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        fecha: form.fecha, factura: form.fecha || null, usuario: form.usuario || null,
        detalles,
      });
      setModalOpen(false);
      setLineas([emptyLine()]);
      load();
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const verDetalle = async (id: number) => {
    const c = await api.get<Compra>(`/compras/${id}`);
    setDetailModal(c);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Compras</h1>
        <button onClick={() => { setForm({ proveedor_id: '', fecha: new Date().toISOString().slice(0, 10), factura: '', usuario: '' }); setLineas([emptyLine()]); setError(''); setModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          + Nueva compra
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['#', 'Fecha', 'Proveedor', 'Factura', 'Total', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compras.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">#{c.id}</td>
                  <td className="px-4 py-3">{new Date(c.fecha).toLocaleDateString('es-CL')}</td>
                  <td className="px-4 py-3">{c.proveedor?.nombre ?? <span className="text-gray-400">Sin proveedor</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{c.factura ?? '-'}</td>
                  <td className="px-4 py-3 font-semibold">${c.total.toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => verDetalle(c.id)} className="text-blue-600 hover:underline text-xs">Ver detalle</button>
                  </td>
                </tr>
              ))}
              {compras.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Sin compras registradas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal nueva compra */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nueva compra" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select value={form.proveedor_id} onChange={e => setForm(p => ({ ...p, proveedor_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input required type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Factura</label>
              <input value={form.factura} onChange={e => setForm(p => ({ ...p, factura: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Líneas de productos */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Productos *</label>
              <button type="button" onClick={addLinea} className="text-blue-600 text-xs hover:underline">+ Agregar línea</button>
            </div>

            <div className="space-y-2">
              {lineas.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <select required value={l.producto_id} onChange={e => updateLinea(i, 'producto_id', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Seleccionar producto</option>
                      {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input required type="number" step="0.001" min="0.001" placeholder="Cantidad"
                      value={l.cantidad} onChange={e => updateLinea(i, 'cantidad', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <input required type="number" step="1" min="0" placeholder="Precio unitario"
                      value={l.precio_compra} onChange={e => updateLinea(i, 'precio_compra', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-3">
                    <input type="date" placeholder="Vencimiento"
                      value={l.fecha_vencimiento} onChange={e => updateLinea(i, 'fecha_vencimiento', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-1 flex items-center justify-center pt-1">
                    {lineas.length > 1 && (
                      <button type="button" onClick={() => removeLinea(i)} className="text-red-500 hover:text-red-700 text-lg">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="font-semibold text-lg">Total: <span className="text-blue-700">${total.toLocaleString('es-CL')}</span></p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">Cancelar</button>
              <button type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Registrar compra</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal detalle compra */}
      {detailModal && (
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Compra #${detailModal.id}`} size="lg">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4 text-gray-600">
              <p><span className="font-medium">Proveedor:</span> {detailModal.proveedor?.nombre ?? '-'}</p>
              <p><span className="font-medium">Fecha:</span> {new Date(detailModal.fecha).toLocaleDateString('es-CL')}</p>
              <p><span className="font-medium">Factura:</span> {detailModal.factura ?? '-'}</p>
              <p><span className="font-medium">Total:</span> ${detailModal.total?.toLocaleString('es-CL')}</p>
            </div>
            <table className="w-full mt-4">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Producto', 'Cantidad', 'P. Compra', 'Subtotal', 'Vencimiento'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailModal.detalles?.map(d => (
                  <tr key={d.id} className="border-b">
                    <td className="px-3 py-2">{d.producto?.nombre}</td>
                    <td className="px-3 py-2">{d.cantidad}</td>
                    <td className="px-3 py-2">${d.precio_compra.toLocaleString('es-CL')}</td>
                    <td className="px-3 py-2">${d.subtotal.toLocaleString('es-CL')}</td>
                    <td className="px-3 py-2 text-gray-400">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
