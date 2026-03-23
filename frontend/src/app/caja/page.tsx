'use client';

import { useEffect, useState, useMemo } from 'react';
import { api, type CajaDia, type ArqueoCaja } from '@/lib/api';

// ── Denominaciones UYU ───────────────────────────────────────────────────────
const BILLETES  = [2000, 1000, 500, 200, 100, 50, 20];
const MONEDAS   = [10, 5, 2, 1];
const DENOMS    = [...BILLETES, ...MONEDAS];

const MEDIO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'VISA', oca: 'OCA',
  master: 'MasterCard', anda: 'ANDA', cabal: 'CABAL',
  transferencia: 'Transferencia', otro: 'Otro', sicfe: 'SICFE',
};
function medioLabel(m: string) { return MEDIO_LABEL[m] ?? m; }

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

function fmtDiff(n: number) {
  if (n === 0) return { text: '$0', cls: 'text-emerald-600' };
  const s = n > 0 ? `+${fmt(n)}` : fmt(n);
  return { text: s, cls: n > 0 ? 'text-emerald-600' : 'text-rose-600' };
}

type Vista = 'arqueo' | 'compras';

// ── Agrupador de medios de pago ───────────────────────────────────────────────
const TARJETAS = new Set(['tarjeta', 'master', 'oca', 'cabal', 'anda', 'sicfe']);

function agruparMedios(medios: CajaDia['ventas_por_medio']) {
  const grupos: { label: string; total: number; cantidad: number; color: string }[] = [];
  let efectivo = 0, efectivoCnt = 0;
  let tarjetas = 0, tarjetasCnt = 0;
  let transf = 0, transfCnt = 0;
  let otros = 0, otrosCnt = 0;

  for (const m of medios) {
    if (m.medio === 'efectivo') { efectivo += m.total; efectivoCnt += m.cantidad; }
    else if (TARJETAS.has(m.medio)) { tarjetas += m.total; tarjetasCnt += m.cantidad; }
    else if (m.medio === 'transferencia') { transf += m.total; transfCnt += m.cantidad; }
    else { otros += m.total; otrosCnt += m.cantidad; }
  }

  if (efectivo)  grupos.push({ label: 'Efectivo',      total: efectivo,  cantidad: efectivoCnt,  color: 'bg-emerald-400' });
  if (tarjetas)  grupos.push({ label: 'Tarjetas',      total: tarjetas,  cantidad: tarjetasCnt,  color: 'bg-blue-400' });
  if (transf)    grupos.push({ label: 'Transferencia', total: transf,    cantidad: transfCnt,    color: 'bg-violet-400' });
  if (otros)     grupos.push({ label: 'Otro',          total: otros,     cantidad: otrosCnt,     color: 'bg-zinc-400' });
  return grupos;
}

// ── Modal Cierre de Caja ──────────────────────────────────────────────────────
function CierreCajaModal({
  datos, fecha, suma, fondoCambio, efectivoVentas, esperado, diferencia, cantidades,
  onClose,
}: {
  datos: CajaDia;
  fecha: string;
  suma: number;
  fondoCambio: number;
  efectivoVentas: number;
  esperado: number;
  diferencia: number;
  cantidades: Record<number, string>;
  onClose: () => void;
}) {
  const fechaLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  const resultado = datos.total_ventas - datos.total_compras;
  const diffCls = diferencia === 0 ? 'text-emerald-600' : Math.abs(diferencia) <= 50 ? 'text-amber-600' : 'text-rose-600';
  const grupos = agruparMedios(datos.ventas_por_medio);

  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const handlePrint = () => {
    onClose();
    setTimeout(() => window.print(), 80);
  };

  const generarImagenCanvas = async (): Promise<string> => {
    const W = 600;
    const PAD = 32;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Medir altura necesaria
    const rows = 6 + grupos.length + (datos.total_compras > 0 ? 3 : 0);
    canvas.width = W;
    canvas.height = 120 + rows * 36 + 80;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, canvas.height);

    // Header morado
    const grad = ctx.createLinearGradient(0, 0, W, 80);
    grad.addColorStop(0, '#7B2D8B');
    grad.addColorStop(1, '#5E1F6C');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 80);

    // Título
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('CIERRE DE CAJA', PAD, 38);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(fechaLabel.toUpperCase(), PAD, 60);

    let y = 100;
    const row = (label: string, value: string, bold = false, color = '#18181b') => {
      ctx.font = bold ? 'bold 14px system-ui, sans-serif' : '14px system-ui, sans-serif';
      ctx.fillStyle = '#71717a';
      ctx.fillText(label, PAD, y);
      ctx.fillStyle = color;
      ctx.font = bold ? 'bold 15px system-ui, sans-serif' : '15px system-ui, sans-serif';
      const tw = ctx.measureText(value).width;
      ctx.fillText(value, W - PAD - tw, y);
      y += 34;
    };
    const sep = (label: string) => {
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(PAD, y - 6, W - PAD * 2, 1);
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(label.toUpperCase(), PAD, y + 10);
      y += 26;
    };

    sep('VENTAS DEL DÍA');
    grupos.forEach(g => row(`${g.label} (${g.cantidad})`, fmt(g.total)));
    row('Total ventas', fmt(datos.total_ventas), true, '#059669');
    y += 8;

    if (datos.total_compras > 0) {
      sep('EGRESOS CONTADO');
      row('Total egresado', fmt(datos.total_compras), true, '#e11d48');
      y += 8;
    }

    sep('ARQUEO');
    row('Contado en caja', fmt(suma));
    row('Esperado', fmt(esperado));
    const diffColor = diferencia === 0 ? '#059669' : Math.abs(diferencia) <= 50 ? '#d97706' : '#e11d48';
    row('Diferencia', `${diferencia >= 0 ? '+' : ''}${fmt(diferencia)}`, false, diffColor);
    y += 8;

    // Resultado neto
    ctx.fillStyle = resultado >= 0 ? '#f0fdf4' : '#fff1f2';
    ctx.beginPath();
    ctx.roundRect(PAD, y, W - PAD * 2, 56, 12);
    ctx.fill();
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#71717a';
    ctx.fillText('Resultado del día', PAD + 16, y + 22);
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = resultado >= 0 ? '#16a34a' : '#dc2626';
    const resStr = `${resultado >= 0 ? '+' : ''}${fmt(resultado)}`;
    const resW = ctx.measureText(resStr).width;
    ctx.fillText(resStr, W - PAD - resW - 16, y + 38);
    y += 72;

    // Footer
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#d4d4d8';
    const stamp = `Zamoritos · ${new Date().toLocaleString('es-CL')}`;
    ctx.fillText(stamp, PAD, y);

    // Ajustar altura real
    canvas.height = y + 20;
    return canvas.toDataURL('image/webp', 0.92);
  };

  const handleSinPapel = async () => {
    setSharing(true);
    setShareUrl('');
    try {
      const dataUrl = await generarImagenCanvas();
      const r = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api') + '/dashboard/caja-imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ fecha, imagen: dataUrl }),
      });
      const json = await r.json();
      const host = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace('/api', '');
      setShareUrl(host + json.url);
    } catch {
      alert('No se pudo generar la imagen');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 print:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Full screen on mobile, max-w on desktop */}
      <div className="relative bg-white w-full sm:max-w-md flex flex-col
                      h-full sm:h-auto sm:max-h-[92vh]
                      sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0"
             style={{ background: 'linear-gradient(135deg, #7B2D8B 0%, #5E1F6C 100%)' }}>
          <div>
            <h2 className="text-base font-bold text-white">Cierre de Caja</h2>
            <p className="text-xs text-white/60 capitalize">{fechaLabel}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Ventas — agrupadas */}
          <section>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Ventas del día</p>
            <div className="bg-zinc-50 rounded-xl divide-y divide-zinc-100">
              {grupos.map(g => (
                <div key={g.label} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${g.color}`} />
                    <span className="text-sm text-zinc-700 font-medium">{g.label}</span>
                    <span className="text-xs text-zinc-400">({g.cantidad})</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{fmt(g.total)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 text-sm font-bold">
                <span className="text-zinc-700">Total ventas</span>
                <span className="text-emerald-600 tabular-nums">{fmt(datos.total_ventas)}</span>
              </div>
            </div>
          </section>

          {/* Egresos */}
          {datos.total_compras > 0 && (
            <section>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Egresos de caja (contado)</p>
              <div className="bg-zinc-50 rounded-xl divide-y divide-zinc-100">
                {datos.compras_por_prov.map(p => (
                  <div key={p.proveedor} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-zinc-600 truncate max-w-[60%]">{p.proveedor}</span>
                    <span className="font-semibold tabular-nums text-rose-600">{fmt(p.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 text-sm font-bold">
                  <span className="text-zinc-700">Total egresado</span>
                  <span className="text-rose-600 tabular-nums">{fmt(datos.total_compras)}</span>
                </div>
              </div>
            </section>
          )}

          {/* Arqueo */}
          <section>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Arqueo de efectivo</p>
            <div className="bg-zinc-50 rounded-xl divide-y divide-zinc-100">
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-zinc-500">Efectivo ventas</span>
                <span className="tabular-nums font-medium text-emerald-600">{fmt(efectivoVentas)}</span>
              </div>
              {fondoCambio > 0 && (
                <div className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-zinc-500">Fondo de cambio</span>
                  <span className="tabular-nums font-medium">{fmt(fondoCambio)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-zinc-500">Esperado en caja</span>
                <span className="tabular-nums font-medium">{fmt(esperado)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-zinc-500">Contado</span>
                <span className="tabular-nums font-medium">{fmt(suma)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-sm font-bold">
                <span className={diffCls}>Diferencia</span>
                <span className={`tabular-nums ${diffCls}`}>{diferencia >= 0 ? '+' : ''}{fmt(diferencia)}</span>
              </div>
            </div>
          </section>

          {/* Resultado neto */}
          <div className={`rounded-2xl px-5 py-4 flex justify-between items-center ${
            resultado >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'
          }`}>
            <div>
              <p className="text-xs text-zinc-400 mb-0.5">Resultado del día</p>
              <p className="text-xs text-zinc-400">Ventas − Egresos contado</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${resultado >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {resultado >= 0 ? '+' : ''}{fmt(resultado)}
            </p>
          </div>

          {/* Firma */}
          <div className="border-t border-zinc-100 pt-3 flex justify-between text-xs text-zinc-300">
            <span>Firma: _______________________</span>
            <span>Sello</span>
          </div>
        </div>

        {/* Footer botones — siempre visible */}
        <div className="shrink-0 px-5 pt-3 pb-5 border-t border-zinc-100 bg-white space-y-3">
          {/* URL generada */}
          {shareUrl && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="shrink-0">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-emerald-700 font-mono truncate flex-1 hover:underline">
                {shareUrl}
              </a>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); }}
                className="shrink-0 text-[10px] text-emerald-600 font-semibold hover:text-emerald-800 border border-emerald-200 rounded-lg px-2 py-1">
                Copiar
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSinPapel}
              disabled={sharing}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60"
              style={{ background: sharing ? '#6b7280' : '#16a34a' }}
              title="Genera imagen del cierre y guarda en el servidor — sin imprimir papel 🌿"
            >
              {sharing ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              )}
              {sharing ? 'Generando…' : 'Sin papel 🌿'}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-colors"
              style={{ background: 'var(--brand-purple)' }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CajaPage() {
  const [vista, setVista]         = useState<Vista>('arqueo');
  const [fecha, setFecha]         = useState(new Date().toISOString().slice(0, 10));
  const [datos, setDatos]         = useState<CajaDia | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [savedOk, setSavedOk]     = useState(false);
  const [cierreOpen, setCierreOpen] = useState(false);

  // Denominaciones: { 2000: qty, 1000: qty, ... }
  const [cantidades, setCantidades] = useState<Record<number, string>>(
    Object.fromEntries(DENOMS.map(d => [d, '']))
  );
  // Cambio (fondo de cambio)
  const [cambio, setCambio] = useState('');

  useEffect(() => {
    setLoading(true);
    setSavedOk(false);
    api.get<CajaDia>(`/dashboard/caja?fecha=${fecha}`)
      .then(d => {
        setDatos(d);
        // Pre-cargar arqueo guardado si existe
        if (d.arqueo) {
          const dens = d.arqueo.denominaciones;
          setCantidades(Object.fromEntries(
            DENOMS.map(denom => [denom, dens[String(denom)] ? String(dens[String(denom)]) : ''])
          ));
          setCambio(d.arqueo.fondo_cambio > 0 ? String(d.arqueo.fondo_cambio) : '');
        } else {
          setCantidades(Object.fromEntries(DENOMS.map(d => [d, ''])));
          setCambio('');
        }
      })
      .finally(() => setLoading(false));
  }, [fecha]);

  // ── Cálculos denominaciones ──────────────────────────────────────────────
  const totalBilletes = useMemo(() =>
    BILLETES.reduce((s, d) => s + d * (parseInt(cantidades[d] || '0') || 0), 0), [cantidades]);

  const totalMonedas = useMemo(() =>
    MONEDAS.reduce((s, d) => s + d * (parseInt(cantidades[d] || '0') || 0), 0), [cantidades]);

  const totalCaja   = totalBilletes + totalMonedas;
  const fondoCambio = parseFloat(cambio) || 0;
  const suma        = totalCaja + fondoCambio;

  // Efectivo de ventas del día
  const efectivoVentas = useMemo(() => {
    if (!datos) return 0;
    return datos.ventas_por_medio
      .filter(m => m.medio === 'efectivo')
      .reduce((s, m) => s + m.total, 0);
  }, [datos]);

  // Diferencia: Suma contada vs esperada (efectivo ventas + fondo)
  const esperado   = efectivoVentas + fondoCambio;
  const diferencia = suma - esperado;

  const setCantidad = (denom: number, val: string) => {
    if (val !== '' && (isNaN(Number(val)) || Number(val) < 0)) return;
    setCantidades(prev => ({ ...prev, [denom]: val }));
  };

  const limpiar = () => {
    setCantidades(Object.fromEntries(DENOMS.map(d => [d, ''])));
    setCambio('');
  };

  const guardarArqueo = async () => {
    setSaving(true);
    setSavedOk(false);
    const denominaciones: Record<string, number> = {};
    DENOMS.forEach(d => {
      const v = parseInt(cantidades[d] || '0') || 0;
      if (v > 0) denominaciones[String(d)] = v;
    });
    try {
      await api.post<ArqueoCaja>('/dashboard/arqueo', {
        fecha,
        denominaciones,
        fondo_cambio:   fondoCambio,
        total_contado:  suma,
        total_esperado: esperado,
        diferencia,
      });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCerrarCaja = async () => {
    await guardarArqueo();
    setCierreOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl overflow-y-auto flex-1">

      {/* ── CSS de impresión: márgenes y sin páginas en blanco ── */}
      <style>{`
        @media print {
          @page { margin: 12mm 15mm; size: A4 portrait; }
          body > * { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:hidden { display: none !important; }
          html, body { height: auto !important; overflow: visible !important; }
        }
      `}</style>

      {/* ── Print-only cierre de caja ── */}
      <div className="hidden print:block font-sans text-zinc-900">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">CIERRE DE CAJA</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">Impreso: {new Date().toLocaleString('es-CL')}</p>
        </div>

        {/* Ventas — agrupadas */}
        <div className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-zinc-300 pb-1 mb-2">Ventas del día</h2>
          {datos && agruparMedios(datos.ventas_por_medio).map(g => (
            <div key={g.label} className="flex justify-between text-sm py-0.5">
              <span>{g.label} ({g.cantidad} transacciones)</span>
              <span className="tabular-nums font-medium">{fmt(g.total)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold border-t border-zinc-200 pt-1 mt-1">
            <span>Total ventas</span>
            <span className="tabular-nums">{fmt(datos?.total_ventas ?? 0)}</span>
          </div>
        </div>

        {/* Compras */}
        <div className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-zinc-300 pb-1 mb-2">Compras del día</h2>
          {datos?.compras_por_prov.map(p => (
            <div key={p.proveedor} className="flex justify-between text-sm py-0.5">
              <span>{p.proveedor} ({p.cantidad})</span>
              <span className="tabular-nums font-medium">{fmt(p.total)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold border-t border-zinc-200 pt-1 mt-1">
            <span>Total compras</span>
            <span className="tabular-nums">{fmt(datos?.total_compras ?? 0)}</span>
          </div>
        </div>

        {/* Arqueo */}
        <div className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-zinc-300 pb-1 mb-2">Arqueo de efectivo</h2>
          {DENOMS.map(d => {
            const qty = parseInt(cantidades[d] || '0') || 0;
            if (qty === 0) return null;
            return (
              <div key={d} className="flex justify-between text-sm py-0.5">
                <span>{fmt(d)} × {qty}</span>
                <span className="tabular-nums">{fmt(d * qty)}</span>
              </div>
            );
          })}
          {fondoCambio > 0 && (
            <div className="flex justify-between text-sm py-0.5">
              <span>Fondo de cambio</span>
              <span className="tabular-nums">{fmt(fondoCambio)}</span>
            </div>
          )}
          <div className="border-t border-zinc-200 pt-1 mt-1 space-y-0.5">
            <div className="flex justify-between text-sm">
              <span>Total contado</span>
              <span className="tabular-nums font-medium">{fmt(suma)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Esperado en caja</span>
              <span className="tabular-nums font-medium">{fmt(esperado)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Diferencia</span>
              <span className={`tabular-nums ${diferencia === 0 ? '' : diferencia > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {fmtDiff(diferencia).text}
              </span>
            </div>
          </div>
        </div>

        {/* Resultado neto */}
        <div className="border-t-2 border-zinc-900 pt-3">
          <div className="flex justify-between text-base font-bold">
            <span>Resultado del día (ventas − compras)</span>
            <span className="tabular-nums">{fmt((datos?.total_ventas ?? 0) - (datos?.total_compras ?? 0))}</span>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-300 flex justify-between text-xs text-zinc-400">
          <span>Firma responsable: ______________________________</span>
          <span>Sello</span>
        </div>
      </div>

      {/* ── Screen content (hidden on print) ── */}
      <div className="print:hidden">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Caja</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Arqueo y movimientos del día</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white"
          />
          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-100 p-0.5 rounded-xl">
            {(['arqueo', 'compras'] as Vista[]).map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  vista === v ? 'text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
                style={vista === v ? { background: 'var(--brand-purple)' } : {}}
              >
                {v === 'arqueo' ? 'Arqueo' : 'Compras'}
              </button>
            ))}
          </div>
          <button
            onClick={handleCerrarCaja}
            disabled={saving}
            className="flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            style={{ background: 'var(--brand-purple)' }}
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
            )}
            Cerrar caja
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-sm text-zinc-400">
          <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
          Cargando...
        </div>
      ) : vista === 'arqueo' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Izquierda: Contador por denominación ── */}
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
              <h2 className="text-sm font-semibold text-zinc-700">Conteo de efectivo</h2>
              <button onClick={limpiar} className="text-xs text-zinc-400 hover:text-rose-500 transition-colors">
                Limpiar
              </button>
            </div>

            <div className="px-5 py-1">
              {/* Cabecera columnas */}
              <div className="grid grid-cols-3 gap-3 py-2.5 border-b border-zinc-50">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Denominación</span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-center">Cantidad</span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right">Subtotal</span>
              </div>

              {/* Separador billetes */}
              <div className="py-2">
                <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest mb-1">Billetes</p>
                {BILLETES.map(d => {
                  const qty = parseInt(cantidades[d] || '0') || 0;
                  const sub = qty * d;
                  return (
                    <div key={d} className="grid grid-cols-3 gap-3 items-center py-1.5">
                      <span className="text-sm font-semibold text-zinc-700 tabular-nums">{fmt(d)}</span>
                      <input
                        type="number"
                        min={0}
                        value={cantidades[d]}
                        onChange={e => setCantidad(d, e.target.value)}
                        placeholder="0"
                        className="text-center text-sm border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--brand-purple)] tabular-nums w-full"
                      />
                      <span className={`text-sm text-right tabular-nums font-medium ${sub > 0 ? 'text-zinc-800' : 'text-zinc-300'}`}>
                        {sub > 0 ? fmt(sub) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Separador monedas */}
              <div className="py-2 border-t border-zinc-50">
                <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest mb-1">Monedas</p>
                {MONEDAS.map(d => {
                  const qty = parseInt(cantidades[d] || '0') || 0;
                  const sub = qty * d;
                  return (
                    <div key={d} className="grid grid-cols-3 gap-3 items-center py-1.5">
                      <span className="text-sm font-semibold text-zinc-700 tabular-nums">{fmt(d)}</span>
                      <input
                        type="number"
                        min={0}
                        value={cantidades[d]}
                        onChange={e => setCantidad(d, e.target.value)}
                        placeholder="0"
                        className="text-center text-sm border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--brand-purple)] tabular-nums w-full"
                      />
                      <span className={`text-sm text-right tabular-nums font-medium ${sub > 0 ? 'text-zinc-800' : 'text-zinc-300'}`}>
                        {sub > 0 ? fmt(sub) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Totales billetes/monedas */}
              <div className="border-t border-zinc-100 py-3 space-y-1">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Billetes</span>
                  <span className="tabular-nums font-medium">{fmt(totalBilletes)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Monedas</span>
                  <span className="tabular-nums font-medium">{fmt(totalMonedas)}</span>
                </div>
              </div>
            </div>

            {/* Footer totales */}
            <div className="px-5 pb-5 space-y-2">
              <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-3">
                <span className="text-sm font-semibold text-zinc-700">Caja (contado)</span>
                <span className="text-xl font-bold tabular-nums text-zinc-900">{fmt(totalCaja)}</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-zinc-600 whitespace-nowrap">Fondo de cambio</label>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                  <input
                    type="number"
                    min={0}
                    value={cambio}
                    onChange={e => setCambio(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-[var(--brand-purple)] tabular-nums text-right"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-zinc-900 text-white rounded-xl px-4 py-3">
                <span className="text-sm font-semibold">Suma total</span>
                <span className="text-xl font-bold tabular-nums">{fmt(suma)}</span>
              </div>
            </div>
          </div>

          {/* ── Derecha: Resumen del día ── */}
          <div className="space-y-4">

            {/* Ventas del día */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-50">
                <h2 className="text-sm font-semibold text-zinc-700">Ventas del día</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{datos?.cantidad_ventas ?? 0} transacciones</p>
              </div>
              <div className="px-5 py-3 space-y-1">
                {datos?.ventas_por_medio.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-3 text-center">Sin ventas</p>
                ) : datos && agruparMedios(datos.ventas_por_medio).map(g => (
                  <div key={g.label} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${g.color}`} />
                      <span className="text-sm text-zinc-600">{g.label}</span>
                      <span className="text-xs text-zinc-400">({g.cantidad})</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-zinc-800">{fmt(g.total)}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-zinc-50 flex justify-between">
                <span className="text-sm font-semibold text-zinc-700">Total ventas</span>
                <span className="text-lg font-bold tabular-nums text-emerald-600">{fmt(datos?.total_ventas ?? 0)}</span>
              </div>
            </div>

            {/* Alerta vencimientos hoy */}
            {(datos?.vencimientos_hoy?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-2 border-b border-amber-100">
                  <span className="text-amber-600 text-base">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Vencimientos hoy</p>
                    <p className="text-xs text-amber-600">{datos!.vencimientos_hoy.length} compra{datos!.vencimientos_hoy.length !== 1 ? 's' : ''} diferida{datos!.vencimientos_hoy.length !== 1 ? 's' : ''} con pago pendiente</p>
                  </div>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {datos!.vencimientos_hoy.map(v => (
                    <div key={v.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-800">{v.proveedor}</p>
                        {v.factura && <p className="text-xs text-amber-600">Factura {v.factura}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums text-amber-800">{fmt(v.saldo)}</p>
                        <p className="text-xs text-amber-500">saldo pendiente</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-amber-100">
                  <a href="/cuentas-pagar" className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
                    Ir a Cuentas a pagar →
                  </a>
                </div>
              </div>
            )}

            {/* Compras contado del día — egreso real de caja */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-700">Egresos de caja</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{datos?.cantidad_compras ?? 0} compras al contado</p>
                  </div>
                  {(datos?.cantidad_diferido ?? 0) > 0 && (
                    <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">
                      +{datos!.cantidad_diferido} diferida{datos!.cantidad_diferido !== 1 ? 's' : ''} {fmt(datos!.total_diferido)}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-5 py-3 space-y-1">
                {datos?.compras_por_prov.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-3 text-center">Sin egresos al contado</p>
                ) : datos?.compras_por_prov.map(p => (
                  <div key={p.proveedor} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="text-sm text-zinc-600 truncate max-w-36">{p.proveedor}</span>
                      <span className="text-xs text-zinc-400">({p.cantidad})</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-zinc-800">{fmt(p.total)}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-zinc-50 flex justify-between">
                <span className="text-sm font-semibold text-zinc-700">Total egresado</span>
                <span className="text-lg font-bold tabular-nums text-rose-600">{fmt(datos?.total_compras ?? 0)}</span>
              </div>
            </div>

            {/* Arqueo / Diferencia */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-50">
                <h2 className="text-sm font-semibold text-zinc-700">Arqueo de caja</h2>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Efectivo ventas</span>
                  <span className="font-semibold tabular-nums text-emerald-600">{fmt(efectivoVentas)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">+ Fondo de cambio</span>
                  <span className="font-semibold tabular-nums text-zinc-700">{fmt(fondoCambio)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-zinc-50 pt-2.5">
                  <span className="text-zinc-500">Esperado en caja</span>
                  <span className="font-semibold tabular-nums text-zinc-800">{fmt(esperado)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Contado</span>
                  <span className="font-semibold tabular-nums text-zinc-800">{fmt(suma)}</span>
                </div>

                <div className={`flex justify-between items-center rounded-xl px-4 py-3 mt-1 ${
                  diferencia === 0
                    ? 'bg-emerald-50 border border-emerald-100'
                    : Math.abs(diferencia) <= 50
                    ? 'bg-amber-50 border border-amber-100'
                    : 'bg-rose-50 border border-rose-100'
                }`}>
                  <span className={`text-sm font-bold ${
                    diferencia === 0 ? 'text-emerald-700' : Math.abs(diferencia) <= 50 ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    Diferencia
                  </span>
                  <span className={`text-lg font-bold tabular-nums ${
                    diferencia === 0 ? 'text-emerald-700' : Math.abs(diferencia) <= 50 ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {(() => { const d = fmtDiff(diferencia); return d.text; })()}
                  </span>
                </div>

                {/* Resultado neto (ventas - compras) */}
                <div className="flex justify-between items-center border-t border-zinc-50 pt-3 mt-2">
                  <span className="text-sm font-semibold text-zinc-700">Resultado del día</span>
                  <span className={`text-lg font-bold tabular-nums ${
                    (datos?.total_ventas ?? 0) >= (datos?.total_compras ?? 0) ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {fmt((datos?.total_ventas ?? 0) - (datos?.total_compras ?? 0))}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      ) : (
        /* ── Vista Compras ── */
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {datos?.compras.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">
              No hay compras registradas para esta fecha
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    {['#', 'Proveedor', 'Factura', 'Productos', 'Total', 'Fecha'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos?.compras.map(c => (
                    <tr key={c.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3 text-zinc-400 text-xs font-mono">#{c.id}</td>
                      <td className="px-4 py-3 font-medium text-zinc-800">{c.proveedor?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{c.factura ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{c.detalles?.length ?? 0} ítem(s)</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-rose-600">{fmt(c.total)}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs tabular-nums">
                        {new Date(c.fecha).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-100 bg-zinc-50">
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Total</td>
                    <td className="px-4 py-3 font-bold text-base tabular-nums text-rose-600">{fmt(datos?.total_compras ?? 0)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      </div>{/* end print:hidden */}

      {/* ── Modal cierre de caja ── */}
      {cierreOpen && datos && (
        <CierreCajaModal
          datos={datos}
          fecha={fecha}
          suma={suma}
          fondoCambio={fondoCambio}
          efectivoVentas={efectivoVentas}
          esperado={esperado}
          diferencia={diferencia}
          cantidades={cantidades}
          onClose={() => setCierreOpen(false)}
        />
      )}
    </div>
  );
}
