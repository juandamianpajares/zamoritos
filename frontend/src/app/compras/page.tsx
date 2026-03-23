'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type Compra, type Proveedor, type Producto } from '@/lib/api';
import Modal from '@/components/Modal';

interface DetalleLine {
  producto_id: string;
  cantidad: string;
  precio_compra: string;
  pct_ganancia: string;
  fecha_vencimiento: string;
}

const emptyLine = (): DetalleLine => ({ producto_id: '', cantidad: '', precio_compra: '', pct_ganancia: '', fecha_vencimiento: '' });

const input = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';
const inputSm = 'w-full border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';
const label = 'block text-xs font-medium text-zinc-500 mb-1.5';

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<Compra | null>(null);
  const [importOpen,  setImportOpen]  = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    proveedor_id: '', fecha: new Date().toISOString().slice(0, 10), factura: '', usuario: '', nota: '',
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
    return s + (parseFloat(l.cantidad) || 0) * (parseFloat(l.precio_compra) || 0);
  }, 0);

  const addLinea = () => setLineas(prev => [...prev, emptyLine()]);
  const removeLinea = (i: number) => setLineas(prev => prev.filter((_, idx) => idx !== i));
  const updateLinea = (i: number, k: keyof DetalleLine, v: string) =>
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  // Al elegir producto, auto-rellena % ganancia actual del producto
  const handleProductoChange = (i: number, productoId: string) => {
    const prod = productos.find(p => p.id === Number(productoId));
    const pct = prod?.precio_compra && prod.precio_compra > 0
      ? String(Math.round(((prod.precio_venta / prod.precio_compra) - 1) * 100))
      : '';
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, producto_id: productoId, pct_ganancia: pct } : l));
  };

  // Precio de venta calculado para una línea (solo display)
  const pvCalcLinea = (l: DetalleLine): number | null => {
    const pc = parseFloat(l.precio_compra);
    const pct = parseFloat(l.pct_ganancia);
    if (!pc || isNaN(pct)) return null;
    return Math.round(pc * (1 + pct / 100));
  };

  const openNew = () => {
    setForm({ proveedor_id: '', fecha: new Date().toISOString().slice(0, 10), factura: '', usuario: '', nota: '' });
    setLineas([emptyLine()]);
    setError('');
    setModalOpen(true);
  };

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
        fecha: form.fecha, factura: form.factura || null, usuario: form.usuario || null,
        nota: form.nota || null,
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
    <div className="p-6 lg:p-8 max-w-6xl overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Compras</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{compras.length} registradas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)}
            className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-xl hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Importar CSV
          </button>
          <button onClick={openNew} className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
            + Nueva compra
          </button>
        </div>
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
                  {['#', 'Fecha', 'Proveedor', 'Factura', 'Total', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compras.map(c => (
                  <tr key={c.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">#{c.id}</td>
                    <td className="px-4 py-3 text-zinc-600">{new Date(c.fecha).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{c.proveedor?.nombre ?? <span className="text-zinc-400">Sin proveedor</span>}</td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{c.factura ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">${Math.round(c.total).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => verDetalle(c.id)} className="text-zinc-500 hover:text-zinc-800 text-xs transition-colors">Ver detalle</button>
                    </td>
                  </tr>
                ))}
                {compras.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-400">Sin compras registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nueva compra */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nueva compra" size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Proveedor</label>
              <select value={form.proveedor_id} onChange={e => setForm(p => ({ ...p, proveedor_id: e.target.value }))} className={input}>
                <option value="">Sin proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Fecha *</label>
              <input required type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} className={input} />
            </div>
            <div>
              <label className={label}>N° Factura</label>
              <input value={form.factura} onChange={e => setForm(p => ({ ...p, factura: e.target.value }))} className={input} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-500">Productos *</label>
              <button type="button" onClick={addLinea} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors">+ Agregar línea</button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-1">
                {['Producto', '', 'Cantidad', '', 'P. unitario', '', 'Vencimiento', '', ''].map((h, i) => (
                  i % 2 === 0 ? <p key={i} className={`text-[10px] font-medium text-zinc-400 uppercase tracking-wide ${
                    i === 0 ? 'col-span-4' : i === 2 ? 'col-span-2' : i === 4 ? 'col-span-2' : i === 6 ? 'col-span-3' : 'col-span-1'
                  }`}>{h}</p> : null
                ))}
              </div>
              {lineas.map((l, i) => {
                const pv = pvCalcLinea(l);
                return (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <select required value={l.producto_id} onChange={e => handleProductoChange(i, e.target.value)} className={inputSm}>
                      <option value="">Seleccionar producto</option>
                      {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input required type="number" step="0.001" min="0.001" placeholder="0"
                      value={l.cantidad} onChange={e => updateLinea(i, 'cantidad', e.target.value)} className={inputSm} />
                  </div>
                  <div className="col-span-2">
                    <input required type="number" step="1" min="0" placeholder="0"
                      value={l.precio_compra} onChange={e => updateLinea(i, 'precio_compra', e.target.value)} className={inputSm} />
                    {/* % ganancia y precio de venta sugerido */}
                    {l.precio_compra && (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number" step="1" placeholder="%"
                          value={l.pct_ganancia}
                          onChange={e => updateLinea(i, 'pct_ganancia', e.target.value)}
                          className="w-14 text-[11px] border border-zinc-200 rounded px-1.5 py-1 tabular-nums focus:outline-none focus:border-zinc-400 bg-white"
                        />
                        <span className="text-[11px] text-zinc-400">%</span>
                        {pv !== null && (
                          <span className={`text-[11px] font-semibold tabular-nums ${pv < parseFloat(l.precio_compra) ? 'text-rose-500' : 'text-emerald-700'}`}>
                            → ${Math.round(pv).toLocaleString('es-CL')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <input type="date" value={l.fecha_vencimiento} onChange={e => updateLinea(i, 'fecha_vencimiento', e.target.value)} className={inputSm} />
                  </div>
                  <div className="col-span-1 flex justify-center pt-1">
                    {lineas.length > 1 && (
                      <button type="button" onClick={() => removeLinea(i)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-500 transition-colors">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className={label}>Nota del pedido</label>
            <textarea
              value={form.nota}
              onChange={e => setForm(p => ({ ...p, nota: e.target.value }))}
              rows={3}
              placeholder="Condiciones acordadas, observaciones, próxima entrega..."
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400 resize-none leading-relaxed"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
            <div className="text-sm">
              <span className="text-zinc-500">Total:</span>
              <span className="ml-2 font-semibold text-zinc-900 text-base tabular-nums">${Math.round(total).toLocaleString('es-CL')}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
              <button type="submit"
                className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors">Registrar compra</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal importar CSV */}
      {importOpen && (
        <ImportarComprasModal onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); load(); }} />
      )}

      {/* Modal detalle */}
      {detailModal && <DetalleCompraModal compra={detailModal} onClose={() => setDetailModal(null)} />}
    </div>
  );
}

// ─── Modal detalle compra ─────────────────────────────────────────────────────
function DetalleCompraModal({ compra, onClose }: { compra: Compra; onClose: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title={`Compra #${compra.id}`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {([
            ['Proveedor', compra.proveedor?.nombre ?? '—'],
            ['Fecha', new Date(compra.fecha).toLocaleDateString('es-CL')],
            ['Factura', compra.factura ?? '—'],
            ['Total', `$${Math.round(compra.total ?? 0).toLocaleString('es-CL')}`],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="bg-zinc-50 rounded-xl px-4 py-3">
              <p className="text-xs text-zinc-400 mb-0.5">{k}</p>
              <p className="text-zinc-800 font-medium">{v}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                {['Producto', 'Cantidad', 'P. Compra', 'Subtotal'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compra.detalles?.map(d => (
                <tr key={d.id} className="border-b border-zinc-50 last:border-0">
                  <td className="px-3 py-2.5 text-zinc-800">{d.producto?.nombre}</td>
                  <td className="px-3 py-2.5 tabular-nums">{d.cantidad}</td>
                  <td className="px-3 py-2.5 tabular-nums">${Math.round(d.precio_compra).toLocaleString('es-CL')}</td>
                  <td className="px-3 py-2.5 tabular-nums font-medium">${Math.round(d.subtotal).toLocaleString('es-CL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal importar compras CSV ───────────────────────────────────────────────
type ImportResult = { compras_creadas: number; omitidas: number; errores: { fila: string | number; error: string }[]; total_grupos: number };

function ImportarComprasModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [archivo,   setArchivo]   = useState<File | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [showFmt,   setShowFmt]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

  const importar = async () => {
    if (!archivo) return;
    setLoading(true); setErrorMsg('');
    const fd = new FormData();
    fd.append('archivo', archivo);
    try {
      const res = await fetch(`${apiBase}/compras/importar`, {
        method: 'POST', headers: { Accept: 'application/json' }, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? 'Error en el servidor');
      setResultado(data as ImportResult);
    } catch (e: unknown) {
      setErrorMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const FORMATO = `factura ; fecha ; proveedor ; codigo_barras ; cantidad ; precio_compra ; fecha_vencimiento

Ejemplo:
CF-0123;2024-03-01;Proveedor SA;7730900660761;10;1200;
CF-0123;2024-03-01;Proveedor SA;7730900660488;5;800;2025-06-01
CF-0124;2024-03-02;Otro Prov;1234;20;500;

Reglas:
• Filas con el mismo número de factura → una sola compra
• Si la factura ya existe en la DB → se omite (idempotente, útil para reimportar)
• El precio de compra se actualiza en el producto
• Stock se incrementa automáticamente
• Se crea un lote por cada línea (para seguimiento de vencimientos)
• proveedor y fecha_vencimiento son opcionales`;

  return (
    <Modal isOpen onClose={onClose} title="Importar compras desde CSV" size="lg">
      <div className="space-y-4 text-sm">
        {resultado ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{resultado.compras_creadas}</p>
                <p className="text-xs text-emerald-500 mt-0.5">Compras creadas</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{resultado.omitidas}</p>
                <p className="text-xs text-amber-500 mt-0.5">Omitidas (ya existían)</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{resultado.errores.length}</p>
                <p className="text-xs text-rose-500 mt-0.5">Errores</p>
              </div>
            </div>
            {resultado.errores.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1">
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-xs text-rose-500 bg-rose-50 px-2 py-1 rounded">
                    {typeof e.fila === 'number' ? `Fila ${e.fila}` : e.fila}: {e.error}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cerrar</button>
              <button onClick={onDone} className="flex-1 py-2.5 font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800">Ver compras</button>
            </div>
          </div>
        ) : (
          <>
            {/* Formato */}
            <button onClick={() => setShowFmt(v => !v)}
              className="w-full text-left text-xs text-violet-600 border border-violet-200 rounded-xl px-3 py-2 hover:bg-violet-50 flex items-center justify-between">
              <span>📋 Ver formato y ejemplo</span>
              <span>{showFmt ? '▲' : '▼'}</span>
            </button>
            {showFmt && (
              <div className="bg-zinc-50 rounded-xl border border-zinc-100 overflow-x-auto">
                <pre className="text-[10px] text-zinc-600 p-3 whitespace-pre-wrap leading-relaxed">{FORMATO}</pre>
              </div>
            )}

            {/* Matching SICFE */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
              <p className="font-semibold text-blue-800">Matching con SICFE</p>
              <p>El campo <code className="bg-blue-100 px-1 rounded">factura</code> es el número del CFE recibido (ej: <code className="bg-blue-100 px-1 rounded">CF-0123</code>). Al importar ventas SICFE, el sistema puede cruzar compras y ventas por este número.</p>
            </div>

            {/* Selector archivo */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Archivo CSV</label>
              <div onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-400 transition-colors">
                {archivo ? (
                  <p className="text-sm font-medium text-zinc-700">{archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)</p>
                ) : (
                  <p className="text-sm text-zinc-400">Hacé clic para elegir el archivo CSV</p>
                )}
              </div>
              <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
                onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
            </div>

            {errorMsg && <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3 py-2 rounded-xl">{errorMsg}</div>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancelar</button>
              <button onClick={importar} disabled={!archivo || loading}
                className="flex-1 py-2.5 font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40">
                {loading ? 'Importando…' : 'Importar'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

