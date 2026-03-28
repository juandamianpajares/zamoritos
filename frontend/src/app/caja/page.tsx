'use client';

import { useEffect, useState, useMemo } from 'react';
import { api, BASE, STORAGE_BASE, type CajaDia, type ArqueoCaja, type ArqueoHistorico } from '@/lib/api';

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
    setTimeout(() => {
      const logoSrc = window.location.origin + '/logo.png';
      const resultado = datos.total_ventas - datos.total_compras;
      const resColor  = resultado >= 0 ? '#15803d' : '#dc2626';
      const resBg     = resultado >= 0 ? '#f0fdf4' : '#fff1f2';
      const resBorder = resultado >= 0 ? '#16a34a' : '#dc2626';

      const gruposRows = grupos.map(g =>
        `<tr><td>${g.label} (${g.cantidad} transac.)</td><td class="r">${fmt(g.total)}</td></tr>`
      ).join('');

      const comprasRows = datos.compras_por_prov.map(p =>
        `<tr><td>${p.proveedor} (${p.cantidad})</td><td class="r red">${fmt(p.total)}</td></tr>`
      ).join('');

      const arqueoRows = DENOMS.map(d => {
        const qty = parseInt(cantidades[d] || '0') || 0;
        if (qty === 0) return '';
        return `<tr><td>$${d.toLocaleString('es-CL')} × ${qty}</td><td class="r">${fmt(d * qty)}</td></tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>Cierre de Caja – ${fecha}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #18181b; }
  header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .logo-wrap { display: flex; align-items: center; gap: 8px; }
  .logo-img { width: 40px; height: 40px; object-fit: contain; }
  .logo-text { font-size: 20px; font-weight: 900; color: #7B2D8B; line-height: 1; }
  .logo-sub { font-size: 9px; color: #a1a1aa; margin-top: 2px; }
  .header-right { text-align: right; }
  .titulo { font-size: 15px; font-weight: 800; color: #18181b; }
  .fecha { font-size: 10px; color: #52525b; margin-top: 3px; text-transform: capitalize; }
  .impreso { font-size: 9px; color: #a1a1aa; margin-top: 1px; }
  h2 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
       color: #71717a; border-bottom: 1px solid #e4e4e7; padding-bottom: 4px; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 0; vertical-align: middle; }
  td.r { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total-row td { font-weight: 700; border-top: 1px solid #d4d4d8; padding-top: 5px; margin-top: 3px; }
  .green { color: #15803d; }
  .red { color: #dc2626; }
  .big-total {
    margin: 18px 0 10px;
    padding: 14px 18px;
    border: 2px solid ${resBorder};
    border-radius: 10px;
    background: ${resBg};
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .big-total .lbl { font-size: 11px; color: #52525b; }
  .big-total .lbl2 { font-size: 9px; color: #71717a; margin-top: 2px; }
  .big-total .amount { font-size: 30px; font-weight: 900; color: ${resColor}; font-variant-numeric: tabular-nums; }
  .firma { margin-top: 28px; padding-top: 10px; border-top: 1px solid #d4d4d8;
           display: flex; justify-content: space-between; font-size: 10px; color: #a1a1aa; }
  .footer { margin-top: 8px; font-size: 9px; color: #d4d4d8; text-align: center; }
  .ventas-total td { font-size: 13px; color: #059669; }
</style>
</head><body>
<header>
  <div class="logo-wrap">
    <img class="logo-img" src="${logoSrc}" onerror="this.style.display='none'" alt="Logo">
    <div>
      <div class="logo-text">Zamoritos</div>
      <div class="logo-sub">Agroveterinaria</div>
    </div>
  </div>
  <div class="header-right">
    <div class="titulo">CIERRE DE CAJA</div>
    <div class="fecha">${fechaLabel}</div>
    <div class="impreso">Impreso: ${new Date().toLocaleString('es-CL')}</div>
  </div>
</header>

<h2>Ventas del día</h2>
<table>
  ${gruposRows}
  <tr class="total-row ventas-total">
    <td>Total ventas</td>
    <td class="r green">${fmt(datos.total_ventas)}</td>
  </tr>
</table>

${datos.total_compras > 0 ? `
<h2>Egresos de caja (contado)</h2>
<table>
  ${comprasRows}
  <tr class="total-row"><td>Total egresado</td><td class="r red">${fmt(datos.total_compras)}</td></tr>
</table>` : ''}

${arqueoRows ? `
<h2>Arqueo de efectivo</h2>
<table>
  ${arqueoRows}
  ${fondoCambio > 0 ? `<tr><td>Fondo de cambio</td><td class="r">${fmt(fondoCambio)}</td></tr>` : ''}
  <tr class="total-row"><td>Total contado</td><td class="r">${fmt(suma)}</td></tr>
  <tr><td>Esperado en caja</td><td class="r">${fmt(esperado)}</td></tr>
  <tr class="total-row">
    <td>Diferencia</td>
    <td class="r ${diferencia === 0 ? '' : diferencia > 0 ? 'green' : 'red'}">${diferencia >= 0 ? '+' : ''}${fmt(diferencia)}</td>
  </tr>
</table>` : ''}

<div class="big-total">
  <div>
    <div class="lbl">Resultado del día</div>
    <div class="lbl2">Ventas − Egresos contado</div>
  </div>
  <div class="amount">${resultado >= 0 ? '+' : ''}${fmt(resultado)}</div>
</div>

<div class="firma">
  <span>Firma responsable: ____________________________</span>
  <span>Sello</span>
</div>
<div class="footer">Zamoritos · Sistema de Gestión</div>
</body></html>`;

      const w = window.open('', '_blank', 'width=794,height=1123,menubar=0,toolbar=0,location=0,scrollbars=1');
      if (!w) { alert('Habilitá las ventanas emergentes para imprimir.'); return; }
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); }, 400);
    }, 80);
  };

  const generarImagenCanvas = async (): Promise<string> => {
    const W = 600;
    const PAD = 32;

    // ── Paso 1: dibujar en canvas grande para calcular altura real ─────────────
    const draft = document.createElement('canvas');
    draft.width  = W;
    draft.height = 2000; // suficiente para cualquier cierre
    const ctx = draft.getContext('2d')!;

    const drawContent = (ctx: CanvasRenderingContext2D) => {
      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, draft.height);

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

      let y = 108;

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
        ctx.fillStyle = '#e4e4e7';
        ctx.fillRect(PAD, y - 2, W - PAD * 2, 1);
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillStyle = '#a1a1aa';
        ctx.fillText(label.toUpperCase(), PAD, y + 14);
        y += 28;
      };

      sep('VENTAS DEL DÍA');
      grupos.forEach(g => row(`${g.label} (${g.cantidad})`, fmt(g.total)));
      row('Total ventas', fmt(datos.total_ventas), true, '#059669');
      y += 10;

      if (datos.total_compras > 0) {
        sep('EGRESOS CONTADO');
        row('Total egresado', fmt(datos.total_compras), true, '#e11d48');
        y += 10;
      }

      sep('ARQUEO');
      row('Contado en caja', fmt(suma));
      row('Esperado en caja', fmt(esperado));
      const diffColor = diferencia === 0 ? '#059669' : Math.abs(diferencia) <= 50 ? '#d97706' : '#e11d48';
      row(`Diferencia`, `${diferencia >= 0 ? '+' : ''}${fmt(diferencia)}`, false, diffColor);
      y += 12;

      // Resultado neto — caja redondeada
      const boxH = 60;
      ctx.fillStyle = resultado >= 0 ? '#f0fdf4' : '#fff1f2';
      ctx.beginPath();
      ctx.roundRect(PAD, y, W - PAD * 2, boxH, 12);
      ctx.fill();
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#71717a';
      ctx.fillText('Resultado del día (ventas − egresos)', PAD + 16, y + 22);
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = resultado >= 0 ? '#16a34a' : '#dc2626';
      const resStr = `${resultado >= 0 ? '+' : ''}${fmt(resultado)}`;
      const resW = ctx.measureText(resStr).width;
      ctx.fillText(resStr, W - PAD - resW - 16, y + 42);
      y += boxH + 16;

      // Footer
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#d4d4d8';
      ctx.fillText(`Zamoritos · ${new Date().toLocaleString('es-CL')}`, PAD, y);
      y += 20;

      return y;
    };

    // Paso 1: medir altura real
    const finalH = drawContent(ctx);

    // Paso 2: canvas del tamaño exacto, dibujar de nuevo
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = finalH;
    drawContent(canvas.getContext('2d')!);

    // WebP preferido; fallback a PNG si el browser no lo soporta
    const dataUrl = canvas.toDataURL('image/webp', 0.92);
    return dataUrl.startsWith('data:image/webp') ? dataUrl : canvas.toDataURL('image/png');
  };

  const handleSinPapel = async () => {
    setSharing(true);
    setShareUrl('');
    try {
      const dataUrl = await generarImagenCanvas();
      const json = await api.post<{ url: string }>('/dashboard/caja-imagen', { fecha, imagen: dataUrl });
      // json.url = '/storage/imagenes_comprobantes/caja_FECHA.webp'
      // Siempre construir URL absoluta para que sea compartible (WhatsApp, etc.)
      const base = STORAGE_BASE || window.location.origin;
      setShareUrl(base + json.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo generar la imagen');
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

// ── Histórico de arqueos ──────────────────────────────────────────────────────

function HistoricoCaja() {
  const [dias, setDias] = useState(30);
  const [data, setData] = useState<ArqueoHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<ArqueoHistorico[]>(`/dashboard/arqueos?dias=${dias}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dias]);

  const fmtFecha = (f: string) =>
    new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const totales = data.reduce(
    (acc, r) => ({
      ventas: acc.ventas + r.total_ventas,
      compras: acc.compras + r.total_compras,
      resultado: acc.resultado + (r.total_ventas - r.total_compras),
    }),
    { ventas: 0, compras: 0, resultado: 0 }
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Histórico de caja</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Arqueos guardados por día</p>
        </div>
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDias(d)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-[9px] transition-colors ${
                dias === d ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {d} días
            </button>
          ))}
        </div>
      </div>

      {/* Totales del período */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-3">
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-1">Ventas período</p>
            <p className="text-xl font-bold tabular-nums text-emerald-600">{fmt(totales.ventas)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-3">
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-1">Compras contado</p>
            <p className="text-xl font-bold tabular-nums text-rose-600">{fmt(totales.compras)}</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 ${totales.resultado >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-1">Resultado</p>
            <p className={`text-xl font-bold tabular-nums ${totales.resultado >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(totales.resultado)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <span className="w-4 h-4 border-2 border-zinc-200 border-t-[var(--brand-purple)] rounded-full animate-spin" />
            Cargando…
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No hay arqueos guardados en los últimos {dias} días</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  {['Fecha', 'Ventas', 'Compras', 'Contado (arqueo)', 'Esperado', 'Diferencia', 'Obs.'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(r => {
                  const diff = fmtDiff(r.diferencia);
                  return (
                    <tr key={r.fecha} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-700 tabular-nums">{fmtFecha(r.fecha)}</td>
                      <td className="px-4 py-3 tabular-nums text-emerald-600 font-semibold">{fmt(r.total_ventas)}<span className="text-zinc-300 font-normal ml-1 text-xs">({r.cant_ventas})</span></td>
                      <td className="px-4 py-3 tabular-nums text-rose-500">{fmt(r.total_compras)}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-zinc-800">{fmt(r.total_contado)}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-600">{fmt(r.total_esperado)}</td>
                      <td className={`px-4 py-3 tabular-nums font-semibold ${diff.cls}`}>{diff.text}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400 max-w-32 truncate">{r.observacion ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CajaPage() {
  const [tab, setTab]             = useState<'hoy' | 'historico'>('hoy');
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

  const handlePrintSemana = async () => {
    const dias: CajaDia[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(fecha + 'T12:00:00');
      d.setDate(d.getDate() - i);
      const f = d.toISOString().slice(0, 10);
      try {
        const res = await api.get<CajaDia>(`/dashboard/caja?fecha=${f}`);
        dias.push(res);
      } catch { /* skip */ }
    }
    const logoSrc = window.location.origin + '/logo.png';
    const rows = dias.map(d => {
      const resultado = d.total_ventas - d.total_compras;
      const resColor  = resultado >= 0 ? '#15803d' : '#dc2626';
      const fLabel = new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit' });
      return `<tr>
        <td>${fLabel}</td>
        <td class="r green">${fmt(d.total_ventas)}</td>
        <td class="r">${d.cantidad_ventas}</td>
        <td class="r red">${d.total_compras > 0 ? fmt(d.total_compras) : '—'}</td>
        <td class="r" style="color:${resColor};font-weight:700">${resultado >= 0 ? '+' : ''}${fmt(resultado)}</td>
      </tr>`;
    }).join('');
    const totalVentas  = dias.reduce((s, d) => s + d.total_ventas, 0);
    const totalCompras = dias.reduce((s, d) => s + d.total_compras, 0);
    const totalRes     = totalVentas - totalCompras;
    const resColor     = totalRes >= 0 ? '#15803d' : '#dc2626';
    const resBg        = totalRes >= 0 ? '#f0fdf4' : '#fff1f2';
    const resBorder    = totalRes >= 0 ? '#16a34a' : '#dc2626';
    const desdeLabel = dias[0] ? new Date(dias[0].fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long' }) : '';
    const hastaLabel = dias[dias.length - 1] ? new Date(dias[dias.length - 1].fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

    const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>Resumen Semanal – ${fecha}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #18181b; }
  header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .logo-wrap { display: flex; align-items: center; gap: 8px; }
  .logo-img { width: 36px; height: 36px; object-fit: contain; }
  .logo-text { font-size: 18px; font-weight: 900; color: #7B2D8B; }
  .logo-sub { font-size: 9px; color: #a1a1aa; margin-top: 1px; }
  .titulo { font-size: 15px; font-weight: 800; }
  .periodo { font-size: 10px; color: #52525b; margin-top: 3px; }
  .impreso { font-size: 9px; color: #a1a1aa; margin-top: 1px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
       color: #71717a; border-bottom: 2px solid #d4d4d8; padding: 4px 0; }
  th.r, td.r { text-align: right; }
  td { padding: 5px 0; border-bottom: 1px solid #f4f4f5; font-variant-numeric: tabular-nums; }
  tr.total-row td { font-weight: 700; border-top: 2px solid #18181b; border-bottom: none; font-size: 13px; padding-top: 7px; }
  .green { color: #15803d; }
  .red { color: #dc2626; }
  .big-total {
    margin: 20px 0 10px;
    padding: 14px 18px;
    border: 2px solid ${resBorder};
    border-radius: 10px;
    background: ${resBg};
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .big-total .lbl { font-size: 11px; color: #52525b; }
  .big-total .lbl2 { font-size: 9px; color: #71717a; margin-top: 2px; }
  .big-total .amount { font-size: 30px; font-weight: 900; color: ${resColor}; }
  .footer { margin-top: 12px; font-size: 9px; color: #d4d4d8; text-align: center; }
</style>
</head><body>
<header>
  <div class="logo-wrap">
    <img class="logo-img" src="${logoSrc}" onerror="this.style.display='none'" alt="">
    <div>
      <div class="logo-text">Zamoritos</div>
      <div class="logo-sub">Agroveterinaria</div>
    </div>
  </div>
  <div style="text-align:right">
    <div class="titulo">RESUMEN SEMANAL</div>
    <div class="periodo">${desdeLabel} → ${hastaLabel}</div>
    <div class="impreso">Impreso: ${new Date().toLocaleString('es-CL')}</div>
  </div>
</header>
<table>
  <thead>
    <tr>
      <th>Día</th>
      <th class="r">Ventas</th>
      <th class="r">Transac.</th>
      <th class="r">Egresos</th>
      <th class="r">Resultado</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td>TOTAL</td>
      <td class="r green">${fmt(totalVentas)}</td>
      <td class="r">${dias.reduce((s, d) => s + d.cantidad_ventas, 0)}</td>
      <td class="r red">${fmt(totalCompras)}</td>
      <td class="r" style="color:${resColor}">${totalRes >= 0 ? '+' : ''}${fmt(totalRes)}</td>
    </tr>
  </tbody>
</table>
<div class="big-total">
  <div>
    <div class="lbl">Resultado de la semana</div>
    <div class="lbl2">Total ventas − Egresos contado</div>
  </div>
  <div class="amount">${totalRes >= 0 ? '+' : ''}${fmt(totalRes)}</div>
</div>
<div class="footer">Zamoritos · Sistema de Gestión</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=794,height=1123,menubar=0,toolbar=0,location=0,scrollbars=1');
    if (!w) { alert('Habilitá las ventanas emergentes para imprimir.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Tabs */}
      <div className="bg-white border-b border-zinc-100 px-6 flex gap-1 shrink-0">
        {([{ id: 'hoy', label: 'Caja del día' }, { id: 'historico', label: 'Histórico' }] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[var(--brand-purple)] text-[var(--brand-purple)]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'historico' && <HistoricoCaja />}

      {tab === 'hoy' && <div className="p-6 lg:p-8 max-w-6xl overflow-y-auto flex-1 pb-24 sm:pb-8">

      <div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Caja</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Arqueo y movimientos del día</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintSemana}
            title="Imprimir resumen de los últimos 7 días"
            className="hidden sm:flex items-center gap-1.5 text-zinc-600 text-sm px-3 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Semana
          </button>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white"
          />
          {/* Cerrar caja — solo visible en desktop; en mobile aparece abajo */}
          <button
            onClick={handleCerrarCaja}
            disabled={saving}
            className="hidden sm:flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
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
      ) : (<>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Izquierda: Contador por denominación ── */}
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
              <div>
                <h2 className="text-sm font-semibold text-zinc-700">Conteo de efectivo</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Ingrese el conteo en efectivo</p>
              </div>
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

        {/* ── Historial de movimientos del día ── */}
        {datos && (datos.compras.length > 0 || (datos as any).ventas?.length > 0) && (
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-zinc-50">
              <h2 className="text-sm font-semibold text-zinc-700">Movimientos del día</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Compras registradas · {datos.compras.length} operaciones</p>
            </div>
            <div className="divide-y divide-zinc-50">
              {datos.compras.map(c => (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-zinc-700">
                        {c.proveedor?.nombre ?? 'Sin proveedor'}
                        {c.factura && <span className="ml-2 text-xs font-mono text-zinc-400">#{c.factura}</span>}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {new Date(c.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        <span className={c.tipo_pago === 'contado' ? 'text-zinc-500' : 'text-amber-600'}>{c.tipo_pago}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-rose-600">-{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
      )}

      </div>{/* end print:hidden */}

      {/* ── Mobile: botón Cerrar caja como barra inferior ── */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden z-20 p-3 bg-white/95 backdrop-blur border-t border-zinc-100 shadow-lg print:hidden">
        <button
          onClick={handleCerrarCaja}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold px-4 py-3.5 rounded-xl transition-colors disabled:opacity-50"
          style={{ background: 'var(--brand-purple)' }}
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
          )}
          Cerrar caja
        </button>
      </div>

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
      </div>}
    </div>
  );
}
