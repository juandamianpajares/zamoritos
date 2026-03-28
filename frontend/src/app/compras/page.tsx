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
    tipo_pago: 'contado', dias_plazo: '30', medio_pago: 'efectivo', referencia_pago: '',
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
    setForm({ proveedor_id: '', fecha: new Date().toISOString().slice(0, 10), factura: '', usuario: '', nota: '', tipo_pago: 'contado', dias_plazo: '30', medio_pago: 'efectivo', referencia_pago: '' });
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
        tipo_pago: form.tipo_pago,
        dias_plazo: form.tipo_pago === 'diferido' ? Number(form.dias_plazo) : 0,
        medio_pago: form.tipo_pago === 'contado' ? form.medio_pago : undefined,
        referencia_pago: form.referencia_pago || null,
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
          <a href="/cuentas-pagar"
            className="border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors flex items-center gap-1.5">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v6l4 2"/>
            </svg>
            Cuentas a pagar
          </a>
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
                  {['#', 'Fecha', 'Proveedor', 'Factura', 'Pago', 'Total', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compras.map((c, idx) => {
                  const estadoColor = c.estado_pago === 'pagado'
                    ? 'bg-emerald-50 text-emerald-700'
                    : c.estado_pago === 'parcial'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-600';
                  const refFactura = c.factura
                    ? { label: c.factura, esReal: true }
                    : { label: `N${String(c.id).padStart(4, '0')}`, esReal: false };
                  return (
                  <tr key={c.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{compras.length - idx}</td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{new Date(c.fecha).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{c.proveedor?.nombre ?? <span className="text-zinc-400">—</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {refFactura.esReal
                        ? <span className="text-zinc-700 font-semibold">{refFactura.label}</span>
                        : <span className="text-zinc-400 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded">{refFactura.label}</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.tipo_pago === 'diferido'
                        ? <span className="text-amber-700">{c.dias_plazo}d · {c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString('es-CL') : '—'}</span>
                        : <span className="text-zinc-500">Contado</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">${Math.round(c.total).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${estadoColor}`}>
                        {c.estado_pago ?? 'pagado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => verDetalle(c.id)} className="text-zinc-500 hover:text-zinc-800 text-xs transition-colors">Ver detalle</button>
                    </td>
                  </tr>
                  );
                })}
                {compras.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-zinc-400">Sin compras registradas</td></tr>
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
              <label className={label}>Proveedor *</label>
              <select required value={form.proveedor_id} onChange={e => setForm(p => ({ ...p, proveedor_id: e.target.value }))} className={input}>
                <option value="" disabled>Seleccioná un proveedor…</option>
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

          {/* ── Condiciones de pago ── */}
          <div className="border border-zinc-100 rounded-xl p-4 space-y-3 bg-zinc-50/50">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Condición de pago</p>
            <div className="flex gap-2">
              {([['contado', 'Contado'], ['diferido', 'Diferido']] as [string, string][]).map(([v, lbl]) => (
                <button key={v} type="button"
                  onClick={() => setForm(p => ({ ...p, tipo_pago: v }))}
                  className={`flex-1 py-2 text-sm font-medium rounded-xl border-2 transition-all ${
                    form.tipo_pago === v
                      ? v === 'contado'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                  }`}
                >{lbl}</button>
              ))}
            </div>

            {form.tipo_pago === 'contado' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Medio de pago</label>
                  <select value={form.medio_pago} onChange={e => setForm(p => ({ ...p, medio_pago: e.target.value }))} className={input}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Referencia / N° cheque</label>
                  <input value={form.referencia_pago} onChange={e => setForm(p => ({ ...p, referencia_pago: e.target.value }))} placeholder="Opcional" className={input} />
                </div>
              </div>
            ) : (() => {
              const venc = form.fecha
                ? new Date(new Date(form.fecha).getTime() + Number(form.dias_plazo) * 86_400_000)
                    .toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : null;
              return (
                <div className="space-y-3">
                  <div>
                    <label className={label}>Plazo</label>
                    <div className="flex gap-2">
                      {(['30', '45', '60'] as string[]).map(d => (
                        <button key={d} type="button"
                          onClick={() => setForm(p => ({ ...p, dias_plazo: d }))}
                          className={`flex-1 py-2 text-sm font-semibold rounded-xl border-2 transition-all ${
                            form.dias_plazo === d
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                          }`}
                        >{d} días</button>
                      ))}
                    </div>
                  </div>
                  {venc && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 16 16" className="text-amber-500 shrink-0">
                        <circle cx="8" cy="8" r="6.5"/><polyline points="8 4.5 8 8 10.5 10"/>
                      </svg>
                      <span className="text-sm text-amber-800">
                        Vence el <strong>{venc}</strong>
                        <span className="text-amber-600 ml-2 text-xs">({form.dias_plazo} días desde la fecha de compra)</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div>
            <label className={label}>Nota del pedido</label>
            <textarea
              value={form.nota}
              onChange={e => setForm(p => ({ ...p, nota: e.target.value }))}
              rows={2}
              placeholder="Condiciones acordadas, observaciones, próxima entrega..."
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400 resize-none leading-relaxed"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
            <div className="text-sm">
              <span className="text-zinc-500">Total:</span>
              <span className="ml-2 font-semibold text-zinc-900 text-base tabular-nums">${Math.round(total).toLocaleString('es-CL')}</span>
              {form.tipo_pago === 'contado'
                ? <span className="ml-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">Contado</span>
                : <span className="ml-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide">{form.dias_plazo}d diferido</span>
              }
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
              <button type="submit"
                className={`px-4 py-2 text-sm text-white rounded-xl transition-colors ${
                  form.tipo_pago === 'contado' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}>
                {form.tipo_pago === 'contado' ? 'Registrar · Contado' : `Registrar · ${form.dias_plazo}d`}
              </button>
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
  const refFactura = compra.factura ?? `N${String(compra.id).padStart(4, '0')}`;
  return (
    <Modal isOpen onClose={onClose} title={`Compra ${refFactura}`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {([
            ['Proveedor', compra.proveedor?.nombre ?? '—'],
            ['Fecha', new Date(compra.fecha).toLocaleDateString('es-CL')],
            ['Referencia', refFactura],
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
type ImportResult = { compras_creadas: number; omitidas: number; desestimados: number; errores: { fila: string | number; error: string }[]; total_codigos: number };

function ImportarComprasModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [archivo,   setArchivo]   = useState<File | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [showFmt,   setShowFmt]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';

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

  const FORMATO = `factura ; fecha ; rut ; codigo_barras ; cantidad ; precio_compra ; fecha_vencimiento

Ejemplo:
CF-0123;2024-03-01;212345670;7730900660761;10;1200;
CF-0123;2024-03-01;212345670;7730900660488;5;800;2025-06-01
CF-0124;2024-03-02;211234560;1234;1;950;
CF-0124;2024-03-02;211234560;9876;0;350;

Lógica de reconciliación:
• Si el mismo código de barras aparece varias veces → solo se procesa la ÚLTIMA fila
• cantidad = 0  → desestimar (no toca precio ni stock)
• cantidad = 1  → actualiza precio de compra, sin movimiento de stock
• cantidad > 1  → actualiza precio + suma al stock + crea lote y movimiento
• Todas las compras se registran como CONTADO / PAGADO
• Si la factura ya existe en la DB → se omite (idempotente)
• rut y fecha_vencimiento son opcionales`;

  return (
    <Modal isOpen onClose={onClose} title="Importar compras desde CSV" size="lg">
      <div className="space-y-4 text-sm">
        {resultado ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{resultado.compras_creadas}</p>
                <p className="text-xs text-emerald-500 mt-0.5">Compras creadas</p>
              </div>
              <div className="bg-sky-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-sky-600">{resultado.total_codigos}</p>
                <p className="text-xs text-sky-500 mt-0.5">Artículos únicos</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-zinc-500">{resultado.desestimados}</p>
                <p className="text-xs text-zinc-400 mt-0.5">Desestimados (cant. 0)</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{resultado.omitidas}</p>
                <p className="text-xs text-amber-500 mt-0.5">Omitidas (ya existían)</p>
              </div>
              {resultado.errores.length > 0 && (
              <div className="col-span-2 bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{resultado.errores.length}</p>
                <p className="text-xs text-rose-500 mt-0.5">Errores</p>
              </div>
              )}
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

