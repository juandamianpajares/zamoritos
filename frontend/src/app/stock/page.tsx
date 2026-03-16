'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type MovimientoStock, type Producto } from '@/lib/api';
import Modal from '@/components/Modal';

const tipoBadge: Record<string, string> = {
  ingreso:      'bg-emerald-50 text-emerald-700',
  venta:        'bg-sky-50 text-sky-700',
  venta_suelta: 'bg-violet-50 text-violet-700',
  ajuste:       'bg-amber-50 text-amber-700',
  vencimiento:  'bg-rose-50 text-rose-700',
};

const inputCls = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';
const labelCls = 'block text-xs font-medium text-zinc-500 mb-1.5';

type Vista = 'movimientos' | 'alertas' | 'fraccionados';

export default function StockPage() {
  const [vista, setVista] = useState<Vista>('movimientos');
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProducto, setFiltroProducto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ producto_id: '', cantidad: '', observacion: '' });
  const [toggling, setToggling] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = filtroProducto ? `?producto_id=${filtroProducto}` : '';
    Promise.all([
      api.get<MovimientoStock[]>(`/stock/movimientos${params}`),
      api.get<Producto[]>('/productos'),
    ]).then(([m, p]) => { setMovimientos(m); setProductos(p); setLoading(false); });
  }, [filtroProducto]);

  useEffect(() => { load(); }, [load]);

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

  const toggleNotificacion = async (producto: Producto) => {
    setToggling(producto.id);
    try {
      await api.patch(`/productos/${producto.id}/notificacion-stock`, {});
      setProductos(prev => prev.map(p =>
        p.id === producto.id ? { ...p, notificar_stock_bajo: !p.notificar_stock_bajo } : p
      ));
    } finally {
      setToggling(null);
    }
  };

  // Filtro de movimientos por búsqueda de texto
  const movimientosFiltrados = busqueda.trim()
    ? movimientos.filter(m =>
        m.producto?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.referencia?.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.observacion?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : movimientos;

  // Filtro de productos para la pestaña alertas
  const productosFiltrados = busqueda.trim()
    ? productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Stock</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {vista === 'movimientos' ? `${movimientosFiltrados.length} movimientos` : `${productos.length} productos`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-100 p-0.5 rounded-xl">
            {([
              { key: 'movimientos',  label: 'Movimientos' },
              { key: 'alertas',      label: 'Alertas' },
              { key: 'fraccionados', label: 'Fraccionados' },
            ] as { key: Vista; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setVista(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  vista === key ? 'text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
                style={vista === key ? { background: 'var(--brand-purple)' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setForm({ producto_id: '', cantidad: '', observacion: '' }); setError(''); setModalOpen(true); }}
            className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Ajuste manual
          </button>
        </div>
      </div>

      {/* Barra de búsqueda + filtro */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400"
          />
        </div>
        {vista === 'movimientos' && (
          <select
            value={filtroProducto}
            onChange={e => setFiltroProducto(e.target.value)}
            className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white w-64"
          >
            <option value="">Todos los productos</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
      </div>

      {/* ── Movimientos ── */}
      {vista === 'movimientos' && (
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
                  {movimientosFiltrados.map(m => (
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
                  {movimientosFiltrados.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-400">Sin movimientos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Alertas de stock ── */}
      {vista === 'alertas' && (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-zinc-50">
            <span className="col-span-5 text-xs font-medium text-zinc-400 uppercase tracking-wide">Producto</span>
            <span className="col-span-2 text-xs font-medium text-zinc-400 uppercase tracking-wide text-right">Stock</span>
            <span className="col-span-2 text-xs font-medium text-zinc-400 uppercase tracking-wide text-right">P. Venta</span>
            <span className="col-span-3 text-xs font-medium text-zinc-400 uppercase tracking-wide text-right">Notificar</span>
          </div>
          {productosFiltrados.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-400">Sin productos</div>
          ) : (
            productosFiltrados.map(p => (
              <div key={p.id} className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-zinc-50 last:border-0 items-center hover:bg-zinc-50/50 transition-colors">
                <div className="col-span-5">
                  <p className="text-sm font-medium text-zinc-800">{p.nombre}</p>
                  {p.marca && <p className="text-xs text-zinc-400">{p.marca}</p>}
                </div>
                <div className="col-span-2 text-right">
                  <span className={`text-sm font-semibold tabular-nums ${p.stock <= 5 ? 'text-rose-600' : 'text-zinc-700'}`}>
                    {p.stock}
                  </span>
                  <span className="text-xs text-zinc-400 ml-1">{p.unidad_medida}</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-zinc-600 tabular-nums">${p.precio_venta.toLocaleString('es-CL')}</span>
                </div>
                <div className="col-span-3 flex justify-end">
                  <button
                    onClick={() => toggleNotificacion(p)}
                    disabled={toggling === p.id}
                    title={p.notificar_stock_bajo ? 'Notificación activa — click para desactivar' : 'Notificación inactiva — click para activar'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      p.notificar_stock_bajo ?? true ? 'bg-emerald-500' : 'bg-zinc-200'
                    } ${toggling === p.id ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        p.notificar_stock_bajo ?? true ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Fraccionados ── */}
      {vista === 'fraccionados' && (() => {
        // Group: find products that have fraccionados children
        const padres = productos.filter(p => productos.some(f => f.fraccionado_de === p.id));
        const solos  = productos.filter(p => p.fraccionado_de && !padres.some(x => x.id === p.fraccionado_de));

        const filtrados = [...padres, ...solos].filter(p =>
          !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
        );

        if (filtrados.length === 0 && !loading) {
          return (
            <div className="bg-white rounded-2xl border border-zinc-100 px-6 py-12 text-center text-sm text-zinc-400">
              Sin productos fraccionados registrados
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {padres
              .filter(p => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
              .map(padre => {
                const hijos = productos.filter(f => f.fraccionado_de === padre.id);
                return (
                  <div key={padre.id} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                    {/* Padre */}
                    <div className="flex items-center gap-4 px-5 py-3 bg-amber-50/50 border-b border-amber-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800">{padre.nombre}</p>
                        <p className="text-xs text-zinc-400">{padre.codigo_barras ?? '—'} · {padre.unidad_medida}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold tabular-nums ${padre.stock <= 0 ? 'text-rose-600' : padre.stock <= 3 ? 'text-amber-500' : 'text-zinc-800'}`}>
                          {padre.stock}
                        </span>
                        <span className="text-xs text-zinc-400 ml-1">bolsas</span>
                      </div>
                      <button
                        onClick={() => { setForm({ producto_id: String(padre.id), cantidad: '', observacion: '' }); setError(''); setModalOpen(true); }}
                        className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-2.5 py-1 hover:bg-zinc-100 transition-colors shrink-0"
                      >
                        Ajustar
                      </button>
                    </div>
                    {/* Hijos */}
                    {hijos.map(hijo => (
                      <div key={hijo.id} className="flex items-center gap-4 px-5 py-2.5 border-b border-zinc-50 last:border-0 pl-10">
                        <svg className="text-zinc-300 shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M2 2v8h10"/>
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-700">{hijo.nombre}</p>
                          <p className="text-xs text-zinc-400">{hijo.codigo_barras ?? '—'} · /kg</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-base font-semibold tabular-nums ${hijo.stock <= 0 ? 'text-rose-600' : hijo.stock <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                            {hijo.stock}
                          </span>
                          <span className="text-xs text-zinc-400 ml-1">kg</span>
                        </div>
                        <div className="text-right text-sm font-medium text-zinc-700">
                          ${hijo.precio_venta.toLocaleString('es-CL')}/kg
                        </div>
                        <button
                          onClick={() => { setForm({ producto_id: String(hijo.id), cantidad: '', observacion: '' }); setError(''); setModalOpen(true); }}
                          className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-2.5 py-1 hover:bg-zinc-100 transition-colors shrink-0"
                        >
                          Ajustar
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        );
      })()}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Ajuste manual de stock" size="sm">
        <form onSubmit={handleAjuste} className="space-y-4">
          {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}

          <div>
            <label className={labelCls}>Producto *</label>
            <select required value={form.producto_id} onChange={e => setForm(p => ({ ...p, producto_id: e.target.value }))} className={inputCls}>
              <option value="">Seleccionar producto</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock} {p.unidad_medida})</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>
              Cantidad * <span className="text-zinc-400 font-normal">(negativo para reducir)</span>
            </label>
            <input required type="number" step="0.001" value={form.cantidad}
              onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))}
              className={inputCls} placeholder="Ej: −5 o +10" />
          </div>

          <div>
            <label className={labelCls}>Observación</label>
            <input value={form.observacion} onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))}
              className={inputCls} placeholder="Motivo del ajuste" />
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
