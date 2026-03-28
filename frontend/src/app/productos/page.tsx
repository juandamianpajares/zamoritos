'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api, type Producto, type Categoria } from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useStockPublisher } from '@/hooks/useProductoSync';

const BASE_STORAGE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api').replace('/api', '/storage');
function fotoUrl(foto: string) { return `${BASE_STORAGE}/${foto}`; }

function efectivaFoto(p: Producto, preferThumb = false): string | null {
  if (preferThumb && p.thumb_url) return p.thumb_url;
  if (p.foto_url) return p.foto_url;
  if (preferThumb && p.thumb) return fotoUrl(p.thumb);
  if (p.foto) return fotoUrl(p.foto);
  return null;
}

const PLACEHOLDER_GRADIENTS: [string, string][] = [
  ['#7B2D8B','#5E1F6C'],['#2563eb','#1d4ed8'],['#059669','#047857'],
  ['#d97706','#b45309'],['#dc2626','#b91c1c'],['#0891b2','#0e7490'],['#7c3aed','#6d28d9'],
];
function placeholderGradient(nombre: string): [string, string] {
  let h = 0; for (const c of nombre) h = c.charCodeAt(0) + ((h << 5) - h);
  return PLACEHOLDER_GRADIENTS[Math.abs(h) % PLACEHOLDER_GRADIENTS.length];
}

function ThumbProducto({ producto }: { producto: Producto }) {
  const [err, setErr] = React.useState(false);
  const src = efectivaFoto(producto, true);
  if (!src || err) {
    const [c1, c2] = placeholderGradient(producto.nombre);
    const initials = producto.nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return (
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold select-none"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
        {initials}
      </div>
    );
  }
  return (
    <img src={src} alt={producto.nombre} loading="lazy"
      className="w-10 h-10 rounded-lg object-cover border border-zinc-100"
      onError={() => setErr(true)} />
  );
}

const emptyForm = {
  nombre: '', codigo_barras: '', marca: '', categoria_id: '',
  unidad_medida: 'unidad', peso: '', precio_venta: '',
  fraccionable: false, modo_fraccion: 'kg' as 'kg' | 'unidad', destacado: false,
  foto_url: '',
};

// Genera preview de thumbnail (200×200 crop centrado, igual que el server)
async function generarThumbPreview(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const W = 200, H = 200;
      const ratio = Math.max(W / img.width, H / img.height);
      const nw = Math.round(img.width * ratio);
      const nh = Math.round(img.height * ratio);
      const cx = Math.round((nw - W) / 2);
      const cy = Math.round((nh - H) / 2);
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, -cx, -cy, nw, nh);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/webp', 0.85));
    };
    img.src = url;
  });
}

// Colores de marca basados en hash del nombre
const MARCA_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-100',
  'bg-violet-50 text-violet-700 border-violet-100',
  'bg-emerald-50 text-emerald-700 border-emerald-100',
  'bg-amber-50 text-amber-700 border-amber-100',
  'bg-rose-50 text-rose-700 border-rose-100',
  'bg-cyan-50 text-cyan-700 border-cyan-100',
  'bg-orange-50 text-orange-700 border-orange-100',
  'bg-teal-50 text-teal-700 border-teal-100',
];
function marcaColor(marca: string) {
  let h = 0; for (const c of marca) h = c.charCodeAt(0) + ((h << 5) - h);
  return MARCA_COLORS[Math.abs(h) % MARCA_COLORS.length];
}


const unidades = ['unidad', 'kg', 'gramo', 'litro', 'mililitro'];
const input = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400';
const label = 'block text-xs font-medium text-zinc-500 mb-1.5';

// ─── Ajuste stock modal ───────────────────────────────────────────────────────
function AjusteStockModal({ producto, onClose, onDone }: { producto: Producto; onClose: () => void; onDone: () => void }) {
  const [cantidad, setCantidad] = useState('');
  const [obs,      setObs]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const confirmar = async () => {
    const qty = parseFloat(cantidad);
    if (!qty || qty === 0) { setError('Ingresá una cantidad (positiva para agregar, negativa para quitar).'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/stock/ajuste', { producto_id: producto.id, cantidad: qty, observacion: obs || undefined });
      onDone();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const nuevoStock = producto.stock + (parseFloat(cantidad) || 0);

  return (
    <Modal isOpen onClose={onClose} title={`Ajuste stock — ${producto.nombre}`}>
      <div className="space-y-4">
        <div className="bg-zinc-50 rounded-xl px-4 py-3 flex justify-between text-sm">
          <span className="text-zinc-500">Stock actual</span>
          <span className="font-semibold text-zinc-800 tabular-nums">{producto.stock} {producto.unidad_medida}</span>
        </div>

        <div>
          <label className={label}>Cantidad a ajustar</label>
          <div className="flex gap-2">
            <button onClick={() => setCantidad(v => String((parseFloat(v) || 0) - 1))}
              className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center text-lg font-bold text-zinc-600 hover:bg-zinc-100">−</button>
            <input
              type="number" step="0.001" value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="Ej: +5 o -2"
              className={`${input} text-center tabular-nums`}
            />
            <button onClick={() => setCantidad(v => String((parseFloat(v) || 0) + 1))}
              className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center text-lg font-bold text-zinc-600 hover:bg-zinc-100">+</button>
          </div>
          {cantidad !== '' && !isNaN(parseFloat(cantidad)) && (
            <p className={`text-xs mt-1.5 font-medium ${nuevoStock < 0 ? 'text-rose-500' : 'text-zinc-500'}`}>
              Nuevo stock: <strong>{nuevoStock.toFixed(2)}</strong> {producto.unidad_medida}
              {nuevoStock < 0 && ' · ⚠ Stock negativo no permitido'}
            </p>
          )}
        </div>

        <div>
          <label className={label}>Observación (opcional)</label>
          <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Ej: conteo físico, merma, etc." className={input} />
        </div>

        {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3 py-2 rounded-xl">{error}</div>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancelar</button>
          <button onClick={confirmar} disabled={loading || nuevoStock < 0}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-40"
            style={{ background: 'var(--brand-teal)' }}>
            {loading ? 'Guardando…' : 'Guardar ajuste'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tipos importación ────────────────────────────────────────────────────────
type ImportResult = { creados: number; actualizados: number; errores: { fila: number; error: string }[]; total_filas: number; categorias_no_encontradas?: string[] };

const COLUMNAS_EJEMPLO = `| Campo | Descripción | Ejemplo |
|---|---|---|
| nombre * | Nombre del producto | Lager 10kg |
| precio_venta * | Precio de venta (entero) | 1200 |
| unidad_medida | unidad / kg / litro / gramo | unidad |
| codigo_barras | EAN-13 o código interno | 7730918030044 |
| marca | Nombre de marca | LAGER |
| categoria | Nombre EXACTO de categoría (ver lista en Categorías) | ALIMENTOS |
| precio_compra | Precio de compra (entero) | 900 |
| peso | Peso en kg (decimal) | 10.5 |
| fraccionable | 1 = sí, 0 = no | 0 |
| modo_fraccion | kg (bolsas) / unidad (blisters) | kg |
| destacado | 1 = aparece primero en POS | 0 |
| en_promo | 0=sin promo · 1=COMBO · 2=OFERTA · 3=REGALO | 0 |
| precio_promo | Precio especial de promo | 1000 |

⚠ categoria debe coincidir EXACTAMENTE con el nombre en el sistema.
   Si no existe, el producto se importa sin categoría.`;

// ─── Modal Detectar por Foto (IA) ────────────────────────────────────────────
type DetectResult = { nombre?: string; marca?: string; codigo_barras?: string; peso?: number; unidad_medida?: string; categoria?: string; categoria_sugerida?: string; descripcion_breve?: string; error?: string };

function DetectarFotoModal({ onClose, onUsar }: { onClose: () => void; onUsar: (data: DetectResult, file?: File) => void }) {
  const [preview,  setPreview]  = useState<string | null>(null);
  const [file,     setFile]     = useState<File | null>(null);
  const [b64,      setB64]      = useState('');
  const [mtype,    setMtype]    = useState('image/jpeg');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<DetectResult | null>(null);
  const [error,    setError]    = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const detectar = async (imageBase64: string, mediaType: string) => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/detectar-producto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mediaType }),
      });
      const data: DetectResult = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onFile = (f: File) => {
    setFile(f);
    setMtype(f.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      const imgB64 = dataUrl.split(',')[1];
      setB64(imgB64);
      // Auto-detect al seleccionar la foto
      detectar(imgB64, f.type || 'image/jpeg');
    };
    reader.readAsDataURL(f);
  };

  const catLabel = result?.categoria_sugerida ?? result?.categoria;

  return (
    <Modal isOpen onClose={onClose} title="Carga rápida por foto · IA">
      <div className="space-y-4 text-sm">
        {/* Upload / Preview */}
        <div
          onClick={() => !loading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 transition-colors ${
            loading ? 'cursor-wait border-violet-300 bg-violet-50/30' : 'cursor-pointer border-zinc-200 hover:border-violet-300 hover:bg-violet-50/30'
          }`}
        >
          {preview ? (
            <div className="relative">
              <img src={preview} alt="preview" className="max-h-48 rounded-lg object-contain" />
              {loading && (
                <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center rounded-lg gap-2">
                  <span className="w-6 h-6 border-2 border-violet-300 border-t-violet-700 rounded-full animate-spin" />
                  <span className="text-xs text-violet-700 font-medium">Analizando…</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-300" viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <p className="text-sm font-medium text-zinc-500">Sacá una foto al producto</p>
              <p className="text-xs text-zinc-400">El nombre, marca, código y categoría se detectan automáticamente</p>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />

        {/* Resultado */}
        {result && !loading && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 divide-y divide-emerald-100">
            <div className="px-3 py-2 flex items-center gap-2">
              <span className="text-emerald-600 text-base">✓</span>
              <span className="text-xs font-semibold text-emerald-700">Producto detectado</span>
            </div>
            {[
              ['Nombre',      result.nombre],
              ['Marca',       result.marca],
              ['Código',      result.codigo_barras],
              ['Peso',        result.peso ? `${result.peso} ${result.unidad_medida ?? ''}` : null],
              ['Categoría',   catLabel],
              ['Descripción', result.descripcion_breve],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k as string} className="flex gap-2 px-3 py-2">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide w-20 shrink-0 pt-0.5">{k}</span>
                <span className="text-xs text-zinc-700">{v as string}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">
            <p className="font-semibold mb-0.5">Error al analizar</p>
            <p>{error}</p>
            {error.includes('ANTHROPIC_API_KEY') && (
              <p className="mt-1 text-rose-500">Configurar en <code className="bg-rose-100 px-1 rounded">frontend/.env.local</code></p>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1 border-t border-zinc-100">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancelar</button>
          {result && !loading ? (
            <button
              onClick={() => onUsar(result, file ?? undefined)}
              className="flex-1 py-2.5 font-semibold rounded-xl text-white"
              style={{ background: 'var(--brand-teal)' }}
            >
              Usar estos datos →
            </button>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="flex-1 py-2.5 font-semibold rounded-xl text-white disabled:opacity-40"
              style={{ background: 'var(--brand-purple)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  Analizando…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Sacar foto
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal Google Sheets ─────────────────────────────────────────────────────
function ImportarSheetsModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [url,       setUrl]      = useState('');
  const [loading,   setLoading]  = useState(false);
  const [resultado, setResult]   = useState<ImportResult | null>(null);
  const [errorMsg,  setError]    = useState('');
  const [showCols,  setShowCols] = useState(false);

  const importar = async () => {
    if (!url.trim()) return;
    setLoading(true); setError('');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';
      const res = await fetch(`${apiBase}/productos/importar-sheets`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? 'Error en el servidor');
      setResult(data as ImportResult);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Importar desde Google Sheets">
      <div className="space-y-4 text-sm">
        {resultado ? (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 space-y-1">
              <p className="font-semibold text-emerald-800">Importación completada</p>
              <p className="text-xs text-emerald-700">✓ Creados: <strong>{resultado.creados}</strong> · Actualizados: <strong>{resultado.actualizados}</strong> · Total filas: {resultado.total_filas}</p>
            </div>
            {(resultado.categorias_no_encontradas?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1.5">⚠ Categorías no encontradas — esos productos se importaron sin categoría:</p>
                <div className="flex flex-wrap gap-1">
                  {resultado.categorias_no_encontradas!.map(c => (
                    <span key={c} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono">{c}</span>
                  ))}
                </div>
                <p className="text-[10px] text-amber-600 mt-1.5">Verificá que los nombres coincidan exactamente con los de <a href="/categorias" className="underline">Categorías</a>.</p>
              </div>
            )}
            {resultado.errores.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-rose-700 mb-2">Errores ({resultado.errores.length}):</p>
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-xs text-rose-600">Fila {e.fila}: {e.error}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={onDone} className="flex-1 py-2.5 font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800">Ver productos</button>
              <button onClick={() => setResult(null)} className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Otra URL</button>
            </div>
          </div>
        ) : (
          <>
            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-1">
              <p className="font-semibold text-blue-800 text-xs uppercase tracking-wide">Cómo obtener la URL</p>
              <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
                <li>Abrí tu Google Sheet</li>
                <li>Menú <strong>Archivo → Compartir → Publicar en la web</strong></li>
                <li>Elegí la hoja y formato <strong>CSV</strong></li>
                <li>Hacé clic en <strong>Publicar</strong> y copiá el enlace</li>
              </ol>
              <p className="text-xs text-blue-600 mt-1">También funciona con URLs de edición del sheet.</p>
            </div>

            {/* Botón columnas */}
            <button
              onClick={() => setShowCols(p => !p)}
              className="w-full text-left text-xs text-violet-600 border border-violet-200 rounded-xl px-3 py-2 hover:bg-violet-50 flex items-center justify-between"
            >
              <span>📋 Ver columnas esperadas y ejemplos</span>
              <span>{showCols ? '▲' : '▼'}</span>
            </button>
            {showCols && (
              <div className="bg-zinc-50 rounded-xl border border-zinc-100 overflow-x-auto">
                <pre className="text-[10px] text-zinc-600 p-3 whitespace-pre-wrap leading-relaxed">{COLUMNAS_EJEMPLO}</pre>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">URL del Google Sheet *</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white placeholder:text-zinc-400"
              />
            </div>

            {errorMsg && <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{errorMsg}</p>}

            <div className="flex gap-2 pt-2 border-t border-zinc-100">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancelar</button>
              <button
                onClick={importar}
                disabled={!url.trim() || loading}
                className="flex-1 py-2.5 font-semibold rounded-xl text-white disabled:opacity-40"
                style={{ background: 'var(--brand-teal)' }}
              >
                {loading ? 'Importando…' : 'Importar'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Modal importar CSV ───────────────────────────────────────────────────────
function ImportarCsvModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [archivo,    setArchivo]    = useState<File | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [resultado,  setResultado]  = useState<ImportResult | null>(null);
  const [errorMsg,   setErrorMsg]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const importar = async () => {
    if (!archivo) return;
    setLoading(true); setErrorMsg('');
    const fd = new FormData();
    fd.append('archivo', archivo);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';
      const res = await fetch(`${apiBase}/productos/importar`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
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

  return (
    <Modal isOpen onClose={onClose} title="Importar catálogo desde CSV">
      <div className="space-y-4">
        {/* Formato */}
        <div className="bg-zinc-50 rounded-xl p-4 text-xs text-zinc-500 space-y-1.5">
          <p className="font-semibold text-zinc-700">Formato esperado (separador <code>;</code>, primera fila = cabecera):</p>
          <p className="font-mono break-all leading-relaxed text-zinc-400">
            codigo_barras ; nombre ; marca ; categoria ; peso ; unidad_medida ; precio_venta ; precio_compra ; fraccionable ; modo_fraccion ; destacado ; en_promo ; precio_promo
          </p>
          <ul className="list-disc list-inside space-y-0.5 mt-2">
            <li><strong>nombre</strong>, <strong>precio_venta</strong> y <strong>unidad_medida</strong> son obligatorios.</li>
            <li><strong>fraccionable</strong> / <strong>destacado</strong>: escribí <code>1</code> para sí, <code>0</code> o vacío para no.</li>
            <li>El precio de compra y stock se registran en <strong>Compras</strong>.</li>
            <li>Si el código de barras ya existe → actualiza el producto.</li>
            <li>Si el código está vacío → crea siempre un producto nuevo.</li>
            <li>Exportá el Excel como <em>CSV UTF-8</em> (en LibreOffice: Guardar como → CSV → separador <code>;</code>).</li>
          </ul>
        </div>

        {/* Selector de archivo */}
        {!resultado && (
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Archivo CSV</label>
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-400 transition-colors"
            >
              {archivo ? (
                <p className="text-sm font-medium text-zinc-700">{archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)</p>
              ) : (
                <p className="text-sm text-zinc-400">Hacé clic para elegir el archivo CSV</p>
              )}
            </div>
            <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3 py-2 rounded-xl">{errorMsg}</div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{resultado.creados}</p>
                <p className="text-xs text-emerald-500 mt-0.5">Creados</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{resultado.actualizados}</p>
                <p className="text-xs text-amber-500 mt-0.5">Actualizados</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{resultado.errores.length}</p>
                <p className="text-xs text-rose-500 mt-0.5">Errores</p>
              </div>
            </div>
            {(resultado.categorias_no_encontradas?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1.5">⚠ Categorías no encontradas — esos productos se importaron sin categoría:</p>
                <div className="flex flex-wrap gap-1">
                  {resultado.categorias_no_encontradas!.map(c => (
                    <span key={c} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono">{c}</span>
                  ))}
                </div>
                <p className="text-[10px] text-amber-600 mt-1.5">Verificá que coincidan exactamente con los nombres en <a href="/categorias" className="underline">Categorías</a>.</p>
              </div>
            )}
            {resultado.errores.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1">
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-xs text-rose-500 bg-rose-50 px-2 py-1 rounded">
                    Fila {e.fila}: {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!resultado ? (
            <button onClick={importar} disabled={!archivo || loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40">
              {loading ? 'Importando…' : 'Importar'}
            </button>
          ) : (
            <button onClick={onDone}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800">
              Ver productos
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal importar imágenes masivo ──────────────────────────────────────────
type ImagenResultado = { archivo: string; producto: string; foto: string; thumb: string };
type ImagenError     = { archivo: string; error: string };
type ImagenImportResult = { procesados: number; errores: ImagenError[]; resultados: ImagenResultado[] };

function ImportarImagenesModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [archivos,   setArchivos]   = useState<FileList | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [resultado,  setResultado]  = useState<ImagenImportResult | null>(null);
  const [errorMsg,   setErrorMsg]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const importar = async () => {
    if (!archivos || archivos.length === 0) return;
    setLoading(true); setErrorMsg('');
    const fd = new FormData();
    for (let i = 0; i < archivos.length; i++) fd.append('fotos[]', archivos[i]);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';
      const res = await fetch(`${apiBase}/imagenes/importar`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Error en el servidor');
      setResultado(data as ImagenImportResult);
    } catch (e: unknown) {
      setErrorMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const count = archivos ? archivos.length : 0;

  return (
    <Modal isOpen onClose={onClose} title="Importar imágenes de productos">
      <div className="space-y-4">

        {/* Requisitos */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 space-y-1.5">
          <p className="font-semibold text-amber-900">Requisitos para las imágenes</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li><strong>Formatos:</strong> JPG, PNG, WebP, GIF</li>
            <li><strong>Tamaño máximo:</strong> 8 MB por imagen</li>
            <li><strong>Dimensiones mínimas:</strong> 200 × 200 px</li>
            <li><strong>Recomendado:</strong> 800 × 800 px, fondo blanco, JPG</li>
          </ul>
          <p className="font-semibold text-amber-900 mt-2">Nombrado de archivos (en orden de prioridad)</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li><code>7730918030044.jpg</code> → código de barras exacto</li>
            <li><code>lager_adulto_10kg.jpg</code> → slug del nombre del producto</li>
            <li><code>lager_7730918030044.jpg</code> → el nombre contiene el código</li>
          </ol>
          <p className="text-amber-700 mt-1">El sistema genera automáticamente la imagen principal <strong>(800×800)</strong> y el thumbnail <strong>(200×200)</strong>.</p>
        </div>

        {/* Selector de archivos */}
        {!resultado && (
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Imágenes</label>
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-400 transition-colors"
            >
              {count > 0 ? (
                <div>
                  <p className="text-sm font-medium text-zinc-700">{count} imagen{count !== 1 ? 'es' : ''} seleccionada{count !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{Array.from(archivos!).map(f => f.name).slice(0, 3).join(', ')}{count > 3 ? `… y ${count - 3} más` : ''}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-zinc-400">Hacé clic para elegir imágenes</p>
                  <p className="text-xs text-zinc-300 mt-0.5">Podés seleccionar múltiples archivos a la vez</p>
                </div>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => setArchivos(e.target.files)} />
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3 py-2 rounded-xl">{errorMsg}</div>
        )}

        {resultado && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{resultado.procesados}</p>
                <p className="text-xs text-emerald-500 mt-0.5">Procesadas</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-rose-600">{resultado.errores.length}</p>
                <p className="text-xs text-rose-500 mt-0.5">Sin match / Error</p>
              </div>
            </div>

            {resultado.resultados.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {resultado.resultados.map((r, i) => (
                  <p key={i} className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded flex justify-between">
                    <span className="truncate">{r.archivo}</span>
                    <span className="text-emerald-500 ml-2 shrink-0">→ {r.producto}</span>
                  </p>
                ))}
              </div>
            )}

            {resultado.errores.length > 0 && (
              <div className="max-h-28 overflow-y-auto space-y-1">
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-xs text-rose-500 bg-rose-50 px-2 py-1 rounded flex justify-between">
                    <span className="truncate">{e.archivo}</span>
                    <span className="ml-2 shrink-0">{e.error}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!resultado ? (
            <button onClick={importar} disabled={count === 0 || loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40">
              {loading ? `Procesando ${count} imagen${count !== 1 ? 'es' : ''}…` : `Subir ${count || ''} imagen${count !== 1 ? 'es' : ''}`}
            </button>
          ) : (
            <button onClick={onDone}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800">
              Ver productos
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductosPage() {
  const [productos,    setProductos]    = useState<Producto[]>([]);
  const [categorias,   setCategorias]   = useState<Categoria[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('');
  const [marcaFilter,  setMarcaFilter]  = useState('');
  const [specialFilter, setSpecialFilter] = useState<'' | 'destacado' | 'combo' | 'oferta' | 'regalo'>('');
  const [stockAdj,     setStockAdj]     = useState<Record<number, boolean>>({});
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editId,       setEditId]       = useState<number | null>(null);
  const [form,         setForm]         = useState({ ...emptyForm });
  const [error,        setError]        = useState('');
  const [toastMsg,     setToastMsg]     = useState('');
  const [fotoFile,     setFotoFile]     = useState<File | null>(null);
  const [fotoPreview,  setFotoPreview]  = useState<string | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [ajusteP,      setAjusteP]      = useState<Producto | null>(null);
  const [notifLoading, setNotifLoading] = useState<number | null>(null);
  const [scanning,     setScanning]     = useState(false);
  const [scanError,    setScanError]    = useState('');
  const [importOpen,   setImportOpen]   = useState(false);
  const [sheetsOpen,   setSheetsOpen]   = useState(false);
  const [fotoIaOpen,   setFotoIaOpen]   = useState(false);
  const [imagenesOpen, setImagenesOpen] = useState(false);
  const [comboModalP,  setComboModalP]  = useState<Producto | null>(null);
  const [comboItems,   setComboItems]   = useState<{ producto_id: number; nombre: string; cantidad: number }[]>([]);
  const [comboEnPromo, setComboEnPromo] = useState<0|1|2|3>(0);
  const [comboPrecioPromo, setComboPrecioPromo] = useState('');
  const [comboSearch,  setComboSearch]  = useState('');
  const [comboSaving,  setComboSaving]  = useState(false);
  const [sinStock,     setSinStock]     = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)      params.set('search',       search);
    if (catFilter)   params.set('categoria_id', catFilter);
    if (marcaFilter) params.set('marca',         marcaFilter);
    Promise.all([
      api.get<Producto[]>(`/productos?${params}`),
      api.get<Categoria[]>('/categorias'),
    ]).then(([p, c]) => { setProductos(p); setCategorias(c); setLoading(false); });
  };

  // Marcas únicas del listado actual (para el dropdown)
  const marcas = [...new Set(productos.map(p => p.marca).filter(Boolean) as string[])].sort();

  const publishStock = useStockPublisher();

  const ajustarStockRapido = async (p: Producto, delta: number) => {
    if (stockAdj[p.id]) return;
    setStockAdj(prev => ({ ...prev, [p.id]: true }));
    try {
      await api.post('/stock/ajuste', { producto_id: p.id, cantidad: delta, observacion: `Ajuste rápido ${delta > 0 ? '+' : ''}${delta}` });
      const newStock = p.stock + delta;
      setProductos(prev => prev.map(x => x.id === p.id ? { ...x, stock: newStock } : x));
      publishStock(p.id, newStock);  // sync a otras tabs en tiempo real
    } finally {
      setStockAdj(prev => ({ ...prev, [p.id]: false }));
    }
  };

  useEffect(() => { load(); }, [search, catFilter, marcaFilter]);
  useEffect(() => { setVisibleCount(25); }, [search, catFilter, marcaFilter, specialFilter, sinStock]);

  const baseProductos = sinStock
    ? productos.filter(p => p.stock <= 0)
    : productos.filter(p => p.stock > 0);

  const productosFiltrados =
    specialFilter === 'destacado' ? baseProductos.filter(p => p.destacado) :
    specialFilter === 'combo'     ? baseProductos.filter(p => p.en_promo === 1) :
    specialFilter === 'oferta'    ? baseProductos.filter(p => p.en_promo === 2) :
    specialFilter === 'regalo'    ? baseProductos.filter(p => p.en_promo === 3) :
    baseProductos;

  const resetFoto = () => { setFotoFile(null); setFotoPreview(null); setThumbPreview(null); };

  const openCreate = () => {
    setEditId(null); setForm({ ...emptyForm }); setError(''); setScanError('');
    resetFoto(); setModalOpen(true);
  };

  const openEdit = (p: Producto) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre, codigo_barras: p.codigo_barras ?? '', marca: p.marca ?? '',
      categoria_id: String(p.categoria_id ?? ''), unidad_medida: p.unidad_medida,
      peso: String(p.peso ?? ''), precio_venta: String(p.precio_venta),
      fraccionable: !!p.fraccionable,
      modo_fraccion: p.modo_fraccion ?? 'kg',
      destacado: !!p.destacado,
      foto_url: p.foto_url ?? '',
    });
    setError('');
    setFotoFile(null);
    setFotoPreview(efectivaFoto(p));
    setModalOpen(true);
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true); setScanError('');
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const res = await fetch('/api/scan-producto', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      const catRaw = (data.categoria_sugerida ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const catMatch = catRaw ? categorias.find(c => {
        const n = c.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return n === catRaw || catRaw.includes(n) || n.includes(catRaw) ||
          catRaw.split(/\s+/).some((w: string) => w.length > 3 && n.includes(w));
      }) : null;
      // También genera thumb preview para la imagen escaneada
      generarThumbPreview(file).then(t => setThumbPreview(t));
      setForm(prev => ({
        ...prev,
        nombre:        data.nombre        ?? prev.nombre,
        marca:         data.marca         ?? prev.marca,
        codigo_barras: data.codigo_barras ?? prev.codigo_barras,
        peso:          data.peso != null   ? String(data.peso) : prev.peso,
        unidad_medida: data.unidad_medida ?? prev.unidad_medida,
        ...(catMatch ? { categoria_id: String(catMatch.id) } : {}),
      }));
    } catch (err: unknown) {
      setScanError((err as Error).message);
    } finally {
      setScanning(false);
      if (scanRef.current) scanRef.current.value = '';
    }
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    setThumbPreview(await generarThumbPreview(file));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body: Record<string, unknown> = {
      nombre: form.nombre, codigo_barras: form.codigo_barras || null,
      marca: form.marca || null,
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      unidad_medida: form.unidad_medida,
      peso: form.peso ? Number(form.peso) : null,
      precio_venta: Number(form.precio_venta),
      fraccionable: form.fraccionable,
      modo_fraccion: form.modo_fraccion,
      destacado: form.destacado,
      foto_url: form.foto_url || null,
    };
    try {
      let saved: Producto;
      if (editId) { saved = await api.put<Producto>(`/productos/${editId}`, body); }
      else         { saved = await api.post<Producto>('/productos', body); }

      if (fotoFile) {
        const fd = new FormData();
        fd.append('foto', fotoFile);
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'}/productos/${saved.id}/foto`,
          { method: 'POST', headers: { Accept: 'application/json' }, body: fd }
        );
      }
      setModalOpen(false);
      resetFoto();
      load();
      setToastMsg(editId ? 'Producto actualizado' : 'Producto creado');
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar producto?')) return;
    await api.delete(`/productos/${id}`);
    load();
  };

  const toggleNotificacion = async (p: Producto) => {
    setNotifLoading(p.id);
    try {
      await api.patch(`/productos/${p.id}/notificacion-stock`, {});
      setProductos(prev => prev.map(x => x.id === p.id ? { ...x, notificar_stock_bajo: !x.notificar_stock_bajo } : x));
    } finally {
      setNotifLoading(null);
    }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="p-6 lg:p-8 max-w-6xl overflow-y-auto flex-1">
      {toastMsg && <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Productos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {productos.filter(p => p.stock > 0).length} con stock
            {productos.filter(p => p.stock <= 0).length > 0 && (
              <span className="ml-1 text-zinc-300">· {productos.filter(p => p.stock <= 0).length} sin stock</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { openCreate(); setFotoIaOpen(true); }} className="border border-violet-200 text-violet-700 text-sm px-4 py-2 rounded-xl hover:bg-violet-50 transition-colors flex items-center gap-1.5">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Foto · IA
          </button>
          <button onClick={() => setSheetsOpen(true)} className="border border-emerald-200 text-emerald-700 text-sm px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3l5 5h-3v4h-4v-4H7l5-5z"/></svg>
            Google Sheets
          </button>
          <button onClick={() => setImagenesOpen(true)} className="border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors flex items-center gap-1.5">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Imágenes
          </button>
          <button onClick={() => setImportOpen(true)} className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-xl hover:bg-zinc-50 transition-colors">
            ↑ CSV
          </button>
          <button onClick={openCreate} className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
            + Nuevo producto
          </button>
        </div>
      </div>

      {/* ── Barra de búsqueda + categoría ───────────────────────────────── */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5.5" cy="5.5" r="4.5"/><line x1="9" y1="9" x2="13" y2="13"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código o precio..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:border-zinc-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
            </button>
          )}
        </div>
        <select
          value={catFilter} onChange={e => { setCatFilter(e.target.value); setMarcaFilter(''); }}
          className="w-44 border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-400"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button
          onClick={() => setSinStock(v => !v)}
          className={`px-3 py-2 text-xs font-medium rounded-xl border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            sinStock
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="5" r="4"/><line x1="3" y1="5" x2="7" y2="5"/></svg>
          Sin stock
        </button>
        {(catFilter || marcaFilter || search || specialFilter || sinStock) && (
          <button
            onClick={() => { setSearch(''); setCatFilter(''); setMarcaFilter(''); setSpecialFilter(''); setSinStock(false); }}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 whitespace-nowrap flex items-center gap-1"
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
            Limpiar
          </button>
        )}
      </div>

      {/* ── Filtros rápidos + marcas (barra unificada) ───────────────────── */}
      {(() => {
        const nDestacado = productos.filter(p => p.destacado).length;
        const nCombo     = productos.filter(p => p.en_promo === 1).length;
        const nOferta    = productos.filter(p => p.en_promo === 2).length;
        const nRegalo    = productos.filter(p => p.en_promo === 3).length;
        const hayEspeciales = nDestacado || nCombo || nOferta || nRegalo;
        if (!hayEspeciales && !marcas.length) return null;

        type SF = typeof specialFilter;
        const pill = (key: SF, label: string, count: number, activeCls: string, inactiveCls: string) =>
          count > 0 ? (
            <button
              key={key}
              onClick={() => setSpecialFilter(specialFilter === key ? '' : key)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                specialFilter === key ? activeCls : inactiveCls
              }`}
            >
              {label} <span className="opacity-70">{count}</span>
            </button>
          ) : null;

        return (
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide items-center">
            {/* Filtros especiales */}
            {pill('destacado', '⭐ Destacados', nDestacado,
              'bg-amber-500 text-white border-amber-500',
              'bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-300')}
            {pill('combo', '📦 Combo', nCombo,
              'bg-violet-500 text-white border-violet-500',
              'bg-violet-50 text-violet-600 border-violet-100 hover:border-violet-300')}
            {pill('oferta', '🏷 Oferta', nOferta,
              'bg-rose-500 text-white border-rose-500',
              'bg-rose-50 text-rose-600 border-rose-100 hover:border-rose-300')}
            {pill('regalo', '🎁 Regalo', nRegalo,
              'bg-emerald-500 text-white border-emerald-500',
              'bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-300')}

            {/* Separador visual si hay ambos grupos */}
            {!!(hayEspeciales && marcas.length) && (
              <div className="w-px h-4 bg-zinc-200 mx-0.5 shrink-0" />
            )}

            {/* Pills de marca */}
            {marcas.map(m => {
              const count = productosFiltrados.filter((p: Producto) => p.marca === m).length;
              if (!count) return null;
              const isActive = marcaFilter === m;
              const col = marcaColor(m);
              return (
                <button
                  key={m}
                  onClick={() => setMarcaFilter(isActive ? '' : m)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                    isActive
                      ? col + ' ring-1 ring-offset-1 ring-current'
                      : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  {m} <span className="opacity-60 ml-0.5">{count}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
            Cargando productos...
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-100">
                  {['', 'Producto', 'Marca', 'Categoría', 'Venta', 'Compra', 'Stock', '', ''].map((h, i) => (
                    <th key={i} className="text-left px-3 py-2.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {productosFiltrados.slice(0, visibleCount).map(p => {
                  const margenPct = p.precio_compra && p.precio_compra > 0
                    ? Math.round(((p.precio_venta - p.precio_compra) / p.precio_compra) * 100)
                    : null;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors group">
                      {/* Thumb — click abre edición */}
                      <td className="pl-3 pr-1 py-2 w-14 cursor-pointer" onClick={() => openEdit(p)} title="Editar producto">
                        <ThumbProducto producto={p} />
                      </td>

                      {/* Nombre + código + badges */}
                      <td className="px-2 py-2.5 max-w-xs">
                        <p className="font-semibold text-zinc-800 leading-tight truncate">{p.nombre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {p.codigo_barras && (
                            <span className="text-[10px] font-mono text-zinc-400">{p.codigo_barras}</span>
                          )}
                          {p.en_promo === 1 && (
                            <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-px rounded-full font-medium border border-violet-100">📦 Combo</span>
                          )}
                          {p.en_promo && p.precio_promo != null && (
                            <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-px rounded-full font-medium border border-rose-100">
                              🏷 ${Math.round(p.precio_promo!).toLocaleString('es-CL')}
                            </span>
                          )}
                          {p.fraccionado_de && (
                            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-px rounded-full font-medium border border-amber-100">✂ Fracc.</span>
                          )}
                          {p.destacado && (
                            <span className="text-[10px]" title="Destacado">⭐</span>
                          )}
                        </div>
                      </td>

                      {/* Marca */}
                      <td className="px-2 py-2.5">
                        {p.marca ? (
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${marcaColor(p.marca)}`}>
                            {p.marca}
                          </span>
                        ) : <span className="text-zinc-300 text-xs">—</span>}
                      </td>

                      {/* Categoría */}
                      <td className="px-2 py-2.5">
                        {p.categoria ? (
                          <span className="text-[11px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-medium">
                            {p.categoria.nombre}
                          </span>
                        ) : <span className="text-zinc-300 text-xs">—</span>}
                      </td>

                      {/* Precio venta + margen */}
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <p className="font-semibold text-zinc-800 tabular-nums">${Math.round(p.precio_venta).toLocaleString('es-CL')}</p>
                        {margenPct !== null && (
                          <p className={`text-[10px] tabular-nums ${margenPct >= 30 ? 'text-emerald-500' : margenPct >= 10 ? 'text-amber-500' : 'text-rose-400'}`}>
                            +{margenPct}% margen
                          </p>
                        )}
                      </td>

                      {/* Precio compra */}
                      <td className="px-2 py-2.5 text-zinc-400 tabular-nums text-xs">
                        {p.precio_compra != null ? `$${Number(p.precio_compra).toLocaleString('es-CL')}` : '—'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          {/* − */}
                          <button
                            onClick={() => ajustarStockRapido(p, -1)}
                            disabled={!!stockAdj[p.id]}
                            title="Quitar 1"
                            className="w-6 h-6 flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 disabled:opacity-30 transition-colors text-sm font-bold"
                          >−</button>

                          {/* stock actual — clic abre modal para ajuste grande */}
                          <button
                            onClick={() => setAjusteP(p)}
                            title="Ajuste manual"
                            className={`min-w-[2.5rem] text-center px-1 py-0.5 rounded-lg text-xs font-semibold tabular-nums transition-colors
                              ${p.stock <= 0 ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                : p.stock <= 5 ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                          >
                            {p.stock}<span className="text-[9px] font-normal ml-0.5 opacity-70">{p.unidad_medida !== 'unidad' ? p.unidad_medida : ''}</span>
                          </button>

                          {/* + */}
                          <button
                            onClick={() => ajustarStockRapido(p, 1)}
                            disabled={!!stockAdj[p.id]}
                            title="Agregar 1"
                            className="w-6 h-6 flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-30 transition-colors text-sm font-bold"
                          >+</button>
                        </div>
                      </td>
                      {/* Destacado + notif */}
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await api.patch(`/productos/${p.id}/destacado`, {});
                              setProductos(prev => prev.map(x => x.id === p.id ? { ...x, destacado: !x.destacado } : x));
                            }}
                            title={p.destacado ? 'Quitar destacado' : 'Marcar destacado'}
                            className={`text-base leading-none transition-all ${p.destacado ? 'opacity-100 scale-110' : 'opacity-20 hover:opacity-50'}`}
                          >⭐</button>
                          <button
                            onClick={() => toggleNotificacion(p)}
                            disabled={notifLoading === p.id}
                            title={p.notificar_stock_bajo ? 'Alerta stock activa' : 'Activar alerta stock'}
                            className={`w-7 h-4 rounded-full transition-colors relative shrink-0 ${
                              p.notificar_stock_bajo ? 'bg-amber-400' : 'bg-zinc-200'
                            } ${notifLoading === p.id ? 'opacity-50' : ''}`}
                          >
                            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                              p.notificar_stock_bajo ? 'translate-x-3.5' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-2 py-2.5 text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {(p.en_promo ?? 0) > 0 && (
                          <button
                            onClick={() => {
                              setComboModalP(p);
                              setComboEnPromo((p.en_promo ?? 0) as 0|1|2|3);
                              setComboPrecioPromo(p.precio_promo != null ? String(p.precio_promo) : '');
                              setComboItems((p.combo_items ?? []).map(ci => ({
                                producto_id: ci.componente_producto_id,
                                nombre: ci.componente?.nombre ?? `#${ci.componente_producto_id}`,
                                cantidad: ci.cantidad,
                              })));
                              setComboSearch('');
                            }}
                            title="Editar componentes de la promo"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors mr-1 font-medium text-white hover:opacity-90"
                            style={{ background: 'var(--brand-purple)' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                            Promo
                          </button>
                        )}
                        <a
                          href={`/compras?producto_id=${p.id}`}
                          title="Registrar compra de este producto"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors mr-1"
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                          </svg>
                        </a>
                        <button
                          onClick={() => openEdit(p)}
                          title="Editar producto"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors mr-1"
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(p.id)} title="Eliminar producto" className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="1" y1="1" x2="10" y2="10"/><line x1="10" y1="1" x2="1" y2="10"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {productosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <p className="text-zinc-400 text-sm">Sin productos{search || catFilter || marcaFilter || specialFilter ? ' para los filtros aplicados' : ''}</p>
                      {(search || catFilter || marcaFilter || specialFilter) && (
                        <button onClick={() => { setSearch(''); setCatFilter(''); setMarcaFilter(''); setSpecialFilter(''); }}
                          className="mt-2 text-xs text-zinc-500 underline hover:text-zinc-700">
                          Limpiar filtros
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {visibleCount < productosFiltrados.length && (
            <div className="px-4 py-3 border-t border-zinc-100 text-center">
              <button
                onClick={() => setVisibleCount(v => v + 25)}
                className="text-sm text-zinc-500 hover:text-zinc-800 font-medium px-6 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                Cargar {Math.min(25, productosFiltrados.length - visibleCount)} más
                <span className="ml-1.5 text-zinc-400 text-xs">({productosFiltrados.length - visibleCount} restantes)</span>
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Modal ajuste stock */}
      {ajusteP && (
        <AjusteStockModal
          producto={ajusteP}
          onClose={() => setAjusteP(null)}
          onDone={() => { setAjusteP(null); load(); }}
        />
      )}

      {/* Modal crear/editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar producto' : 'Nuevo producto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>}

          {/* Foto + Escanear */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={label} style={{ margin: 0 }}>Foto del producto</label>
              <button
                type="button"
                onClick={() => scanRef.current?.click()}
                disabled={scanning}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors font-medium"
              >
                {scanning ? (
                  <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-700 rounded-full animate-spin" />
                ) : (
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
                {scanning ? 'Analizando…' : 'Escanear con IA'}
              </button>
            </div>
            {scanError && <p className="text-xs text-rose-500 mb-2">{scanError}</p>}
            <div className="flex items-start gap-3">
              {/* Preview principal 800×800 */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 transition-colors overflow-hidden flex items-center justify-center shrink-0"
                >
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-zinc-400">
                      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="3"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span className="text-[10px]">Subir foto</span>
                    </div>
                  )}
                </button>
                <span className="text-[9px] text-zinc-400">800×800</span>
              </div>
              {/* Preview thumbnail 200×200 */}
              {thumbPreview && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200 shrink-0">
                    <img src={thumbPreview} alt="thumb" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[9px] text-zinc-400">thumb</span>
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div>
                  <label className={label}>URL de imagen web</label>
                  <input
                    value={form.foto_url}
                    onChange={e => { setForm(p => ({ ...p, foto_url: e.target.value })); if (e.target.value) setFotoPreview(e.target.value); }}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className={input}
                  />
                </div>
                {fotoPreview && (
                  <button
                    type="button"
                    onClick={() => { resetFoto(); setForm(p => ({ ...p, foto_url: '' })); if (fileRef.current) fileRef.current.value = ''; }}
                    className="text-xs text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    Quitar imagen
                  </button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
            <input ref={scanRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={label}>Nombre *</label>
              <input required value={form.nombre} onChange={f('nombre')} className={input} />
            </div>
            <div>
              <label className={label}>Código de barras</label>
              <input value={form.codigo_barras} onChange={f('codigo_barras')} className={input} />
            </div>
            <div>
              <label className={label}>Marca</label>
              <input value={form.marca} onChange={f('marca')} className={input} />
            </div>
            <div>
              <label className={label}>Categoría</label>
              <select value={form.categoria_id} onChange={f('categoria_id')} className={input}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Unidad de medida *</label>
              <select value={form.unidad_medida} onChange={f('unidad_medida')} className={input}>
                {unidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Peso del envase</label>
              {editId && productos.find(p => p.id === editId)?.en_promo === 1 ? (
                <div className={`${input} bg-zinc-50 text-zinc-400 cursor-not-allowed`}>
                  No aplica en combos
                </div>
              ) : (
                <input type="number" step="0.001" min="0" value={form.peso} onChange={f('peso')}
                  placeholder="Ej: 22 (kg)" className={input} />
              )}
            </div>

            <div>
              <label className={label}>Precio de venta *</label>
              <input required type="number" step="1" min="0" value={form.precio_venta} onChange={f('precio_venta')}
                placeholder="Ej: 1500" className={input} />
              <p className="text-xs text-zinc-400 mt-1">El precio de compra y stock se actualizan desde <strong>Compras</strong>.</p>
            </div>

            {/* Destacado */}
            <div className="flex items-center justify-between border border-amber-100 bg-amber-50/60 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-800">Producto destacado</p>
                <p className="text-xs text-zinc-400">Aparece primero en el POS y en reportes</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, destacado: !p.destacado }))}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.destacado ? 'bg-amber-400' : 'bg-zinc-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.destacado ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

          </div>

          {/* ── Fraccionable ── */}
          <div className="border border-zinc-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-800">¿Es fraccionable?</p>
                <p className="text-xs text-zinc-400">
                  {form.fraccionable
                    ? form.modo_fraccion === 'kg' ? 'Bolsa/alimento → se divide por kg' : 'Blister/caja → se divide por unidad'
                    : 'El producto se vende entero, sin subdivisión'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, fraccionable: !p.fraccionable }))}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.fraccionable ? 'bg-amber-500' : 'bg-zinc-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.fraccionable ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            {form.fraccionable && (
              <div className="border-t border-zinc-100 px-4 py-3 bg-amber-50/40 flex gap-2">
                {([
                  { value: 'kg',     label: 'Por kg',      desc: 'Bolsas, alimentos' },
                  { value: 'unidad', label: 'Por unidad',  desc: 'Blisters, pastillas' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, modo_fraccion: opt.value, unidad_medida: opt.value }))}
                    className={`flex-1 text-left px-3 py-2 rounded-lg border transition-colors ${
                      form.modo_fraccion === opt.value
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] text-zinc-400">{opt.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors">
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal importar CSV ── */}
      {importOpen && (
        <ImportarCsvModal
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); load(); }}
        />
      )}

      {/* ── Modal Google Sheets ── */}
      {sheetsOpen && (
        <ImportarSheetsModal
          onClose={() => setSheetsOpen(false)}
          onDone={() => { setSheetsOpen(false); load(); }}
        />
      )}

      {/* ── Modal Componentes promo ── */}
      {comboModalP && (() => {
        const promoLabels: Record<number, string> = { 1: 'COMBO', 2: 'OFERTA', 3: 'REGALO' };
        const matchSearch = comboSearch.trim().toLowerCase();
        const sugeridos = matchSearch.length >= 2
          ? productos.filter(p =>
              p.id !== comboModalP.id &&
              (p.nombre.toLowerCase().includes(matchSearch) || (p.codigo_barras ?? '').includes(matchSearch)) &&
              !comboItems.some(ci => ci.producto_id === p.id)
            ).slice(0, 6)
          : [];

        const saveCombo = async () => {
          setComboSaving(true);
          try {
            await api.put(`/productos/${comboModalP.id}/combo-items`, {
              en_promo: comboEnPromo,
              precio_promo: comboPrecioPromo !== '' ? parseInt(comboPrecioPromo, 10) : null,
              componentes: comboItems.map(ci => ({ producto_id: ci.producto_id, cantidad: ci.cantidad })),
            });
            setProductos(prev => prev.map(p => p.id === comboModalP.id
              ? { ...p, en_promo: comboEnPromo, precio_promo: comboPrecioPromo !== '' ? parseInt(comboPrecioPromo, 10) : undefined,
                  combo_items: comboItems.map(ci => ({ componente_producto_id: ci.producto_id, cantidad: ci.cantidad, componente: { nombre: ci.nombre } as any })) }
              : p
            ));
            setToastMsg('Componentes guardados');
            setComboModalP(null);
          } catch {
            setToastMsg('Error al guardar');
          } finally {
            setComboSaving(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setComboModalP(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Componentes de promo</h2>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{comboModalP.nombre}</p>
              </div>

              {/* Tipo + precio promo */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Tipo</label>
                  <select
                    value={comboEnPromo}
                    onChange={e => setComboEnPromo(parseInt(e.target.value) as 0|1|2|3)}
                    className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-violet-400"
                  >
                    <option value={0}>Sin promo</option>
                    <option value={1}>COMBO</option>
                    <option value={2}>OFERTA</option>
                    <option value={3}>REGALO</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Precio promo ($)</label>
                  <input
                    type="number" min="0" step="1"
                    value={comboPrecioPromo}
                    onChange={e => setComboPrecioPromo(e.target.value)}
                    placeholder="Ej: 2013"
                    className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-violet-400"
                  />
                </div>
              </div>

              {/* Buscar y agregar componente */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Agregar componente</label>
                <input
                  type="text"
                  value={comboSearch}
                  onChange={e => setComboSearch(e.target.value)}
                  placeholder="Buscar producto por nombre o código…"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-violet-400"
                />
                {sugeridos.length > 0 && (
                  <div className="mt-1 border border-zinc-100 rounded-xl overflow-hidden shadow-sm">
                    {sugeridos.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setComboItems(prev => [...prev, { producto_id: p.id, nombre: p.nombre, cantidad: 1 }]);
                          setComboSearch('');
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-violet-50 flex items-center justify-between border-b border-zinc-50 last:border-0"
                      >
                        <span className="font-medium text-zinc-700">{p.nombre}</span>
                        <span className="text-zinc-400 font-mono">{p.codigo_barras ?? ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de componentes */}
              {comboItems.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500">Componentes ({comboItems.length})</p>
                  {comboItems.map((ci, idx) => (
                    <div key={ci.producto_id} className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2">
                      <span className="flex-1 text-xs font-medium text-zinc-700 truncate">{ci.nombre}</span>
                      <input
                        type="number" min="0.001" step="0.001"
                        value={ci.cantidad}
                        onChange={e => setComboItems(prev => prev.map((x, i) => i === idx ? { ...x, cantidad: parseFloat(e.target.value) || 1 } : x))}
                        className="w-16 px-2 py-1 text-xs border border-zinc-200 rounded-lg text-center focus:outline-none focus:border-violet-400"
                      />
                      <span className="text-[10px] text-zinc-400">uds</span>
                      <button
                        type="button"
                        onClick={() => setComboItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-300 hover:text-rose-600 text-xs px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
                      >✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-300 text-center py-2">Sin componentes — buscá un producto arriba</p>
              )}

              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={() => setComboModalP(null)}
                  className="flex-1 py-2.5 text-sm text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={saveCombo} disabled={comboSaving}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-colors"
                  style={{ background: 'var(--brand-purple)' }}>
                  {comboSaving ? 'Guardando…' : `Guardar ${comboEnPromo > 0 ? promoLabels[comboEnPromo] : ''}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal Imágenes masivo ── */}
      {imagenesOpen && (
        <ImportarImagenesModal
          onClose={() => setImagenesOpen(false)}
          onDone={() => { setImagenesOpen(false); load(); }}
        />
      )}

      {/* ── Modal Foto IA ── */}
      {fotoIaOpen && (
        <DetectarFotoModal
          onClose={() => setFotoIaOpen(false)}
          onUsar={(data, imgFile) => {
            setFotoIaOpen(false);
            // Coincidencia de categoría: busca la DB que más se parezca al valor sugerido
            const catRaw = (data.categoria_sugerida ?? data.categoria ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const catMatch = categorias.find(c => {
              const n = c.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              return n === catRaw || catRaw.includes(n) || n.includes(catRaw) ||
                catRaw.split(/\s+/).some((w: string) => w.length > 3 && n.includes(w));
            });
            // Si nos pasaron el archivo de imagen, usarlo como foto del producto
            if (imgFile) {
              setFotoFile(imgFile);
              setFotoPreview(URL.createObjectURL(imgFile));
              generarThumbPreview(imgFile).then(t => setThumbPreview(t));
            }
            setForm(prev => ({
              ...prev,
              nombre:        data.nombre        ?? prev.nombre,
              codigo_barras: data.codigo_barras ?? prev.codigo_barras,
              marca:         data.marca         ?? prev.marca,
              peso:          data.peso           ? String(data.peso) : prev.peso,
              unidad_medida: data.unidad_medida ?? prev.unidad_medida,
              categoria_id:  catMatch            ? String(catMatch.id) : prev.categoria_id,
            }));
            setModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
