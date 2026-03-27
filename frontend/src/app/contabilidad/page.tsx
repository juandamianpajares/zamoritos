'use client';

import { useState } from 'react';

// ─── Mock data ────────────────────────────────────────────────────────────────

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtDiff = (n: number) => {
  const abs = fmt(Math.abs(n));
  if (n === 0) return { text: '$0', cls: 'text-zinc-400' };
  return n > 0 ? { text: `+${abs}`, cls: 'text-emerald-600 font-semibold' } : { text: `-${abs}`, cls: 'text-rose-600 font-semibold' };
};

const BANCOS_DEBITO = [
  { banco: 'BROU',      red: 'VISA débito',   transacciones: 14, bruto: 28400, comision: 0,    neto: 28400 },
  { banco: 'Santander', red: 'VISA débito',   transacciones: 7,  bruto: 11200, comision: 0,    neto: 11200 },
  { banco: 'Itaú',      red: 'Master débito', transacciones: 5,  bruto:  8700, comision: 0,    neto: 8700  },
  { banco: 'BBVA',      red: 'VISA débito',   transacciones: 3,  bruto:  4100, comision: 0,    neto: 4100  },
  { banco: 'Scotiabank',red: 'Cabal débito',  transacciones: 2,  bruto:  3200, comision: 0,    neto: 3200  },
];

const MOVS_DEBITO = [
  { fecha: '27/03', hora: '09:14', banco: 'BROU',      red: 'VISA deb.',   monto: 2400, acred: '28/03', estado: 'acreditado' },
  { fecha: '27/03', hora: '10:33', banco: 'Santander', red: 'VISA deb.',   monto: 1800, acred: '28/03', estado: 'acreditado' },
  { fecha: '27/03', hora: '11:05', banco: 'Itaú',      red: 'Master deb.', monto:  950, acred: '28/03', estado: 'pendiente'  },
  { fecha: '27/03', hora: '12:18', banco: 'BROU',      red: 'VISA deb.',   monto: 3200, acred: '28/03', estado: 'pendiente'  },
  { fecha: '27/03', hora: '14:40', banco: 'BBVA',      red: 'VISA deb.',   monto: 4100, acred: '28/03', estado: 'pendiente'  },
  { fecha: '26/03', hora: '10:01', banco: 'BROU',      red: 'VISA deb.',   monto: 5600, acred: '27/03', estado: 'acreditado' },
  { fecha: '26/03', hora: '11:22', banco: 'Santander', red: 'VISA deb.',   monto: 2200, acred: '27/03', estado: 'acreditado' },
  { fecha: '26/03', hora: '15:50', banco: 'Itaú',      red: 'Master deb.', monto: 1750, acred: '27/03', estado: 'acreditado' },
];

const LOTES = [
  { id: 1, terminal: 'POS-01 (VISA)',   red: 'VISA',   fecha: '27/03', cant: 12, bruto: 31200, comPct: 2.5, estado: 'abierto',   acred: '31/03' },
  { id: 2, terminal: 'POS-02 (Master)', red: 'Master', fecha: '27/03', cant:  5, bruto:  9400, comPct: 2.8, estado: 'abierto',   acred: '31/03' },
  { id: 3, terminal: 'POS-01 (VISA)',   red: 'VISA',   fecha: '26/03', cant: 18, bruto: 44800, comPct: 2.5, estado: 'cerrado',   acred: '30/03' },
  { id: 4, terminal: 'POS-02 (Master)', red: 'Master', fecha: '26/03', cant:  8, bruto: 17600, comPct: 2.8, estado: 'acreditado',acred: '30/03' },
  { id: 5, terminal: 'POS-01 (VISA)',   red: 'VISA',   fecha: '25/03', cant: 21, bruto: 52100, comPct: 2.5, estado: 'acreditado',acred: '29/03' },
  { id: 6, terminal: 'POS-02 (Master)', red: 'Master', fecha: '25/03', cant:  9, bruto: 19300, comPct: 2.8, estado: 'acreditado',acred: '29/03' },
];

const COMPARACION = [
  { banco: 'BROU / VISA cred.',     periodo: 'Mar 2026', vendido: 128400, comPct: 2.5, esperado: 125190, recibido: 125190, fechaAcred: '10/04' },
  { banco: 'Santander / Master',    periodo: 'Mar 2026', vendido:  54200, comPct: 2.8, esperado:  52683, recibido:  52200, fechaAcred: '12/04' },
  { banco: 'Itaú / VISA cred.',     periodo: 'Mar 2026', vendido:  38700, comPct: 2.5, esperado:  37733, recibido:      0, fechaAcred: '15/04' },
  { banco: 'OCA',                   periodo: 'Mar 2026', vendido:  21000, comPct: 3.0, esperado:  20370, recibido:  20370, fechaAcred: '08/04' },
  { banco: 'BROU / VISA cred.',     periodo: 'Feb 2026', vendido: 119200, comPct: 2.5, esperado: 116220, recibido: 116000, fechaAcred: '10/03' },
  { banco: 'Santander / Master',    periodo: 'Feb 2026', vendido:  48900, comPct: 2.8, esperado:  47535, recibido:  47535, fechaAcred: '12/03' },
];

const BALANCE = {
  periodo: 'Marzo 2026',
  ingresos: { efectivo: 84200, debito: 55600, credito: 113700, transferencia: 12400 },
  egresos:  { compras: 62400, ajustes: 3200 },
};

type Tab = 'resumen' | 'debito' | 'credito' | 'comparacion' | 'contabilidad';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen',      label: 'Resumen'        },
  { id: 'debito',       label: 'Débito'         },
  { id: 'credito',      label: 'Crédito / Lotes'},
  { id: 'comparacion',  label: 'Comparación'    },
  { id: 'contabilidad', label: 'Contabilidad'   },
];

// ─── Sub-páginas ──────────────────────────────────────────────────────────────

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{children}</span>;
}

function StatCard({ label, value, sub, color = 'text-zinc-900' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 px-5 py-4 flex flex-col gap-1 shadow-sm">
      <p className="text-xs text-zinc-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function TabResumen() {
  const totalIngresos = Object.values(BALANCE.ingresos).reduce((a, b) => a + b, 0);
  const totalEgresos  = Object.values(BALANCE.egresos).reduce((a, b) => a + b, 0);
  const neto = totalIngresos - totalEgresos;

  const medios = [
    { label: 'Efectivo',       value: BALANCE.ingresos.efectivo,      color: 'bg-emerald-400', pill: 'bg-emerald-100 text-emerald-700' },
    { label: 'Débito',         value: BALANCE.ingresos.debito,        color: 'bg-sky-400',     pill: 'bg-sky-100 text-sky-700' },
    { label: 'Crédito',        value: BALANCE.ingresos.credito,       color: 'bg-blue-500',    pill: 'bg-blue-100 text-blue-700' },
    { label: 'Transferencia',  value: BALANCE.ingresos.transferencia, color: 'bg-violet-400',  pill: 'bg-violet-100 text-violet-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Ingresos" value={fmt(totalIngresos)} sub={BALANCE.periodo} color="text-emerald-700" />
        <StatCard label="Egresos"  value={fmt(totalEgresos)}  sub="Compras + ajustes" color="text-rose-600" />
        <StatCard label="Resultado neto" value={fmt(neto)} sub={BALANCE.periodo} color={neto >= 0 ? 'text-emerald-700' : 'text-rose-600'} />
        <StatCard label="Tipo de cambio USD" value="$43,50" sub="USD · actualizar" />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700">Ingresos por medio de cobro — {BALANCE.periodo}</h3>
        </div>
        <div className="p-5 space-y-3">
          {medios.map(m => (
            <div key={m.label} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${m.color}`} />
              <span className="text-sm text-zinc-700 w-28">{m.label}</span>
              <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${m.color}`} style={{ width: `${(m.value / totalIngresos) * 100}%` }} />
              </div>
              <span className="text-sm font-semibold tabular-nums text-zinc-700 w-24 text-right">{fmt(m.value)}</span>
              <span className="text-xs text-zinc-400 w-10 text-right">{((m.value / totalIngresos) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800 flex items-start gap-3">
        <svg className="shrink-0 mt-0.5" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6.5" /><line x1="8" y1="5" x2="8" y2="8.5" strokeWidth="2" /><line x1="8" y1="10.5" x2="8" y2="11" strokeWidth="2" />
        </svg>
        <span><strong>Prototipo:</strong> Los datos mostrados son de ejemplo. La integración con ventas reales se implementa en la siguiente etapa.</span>
      </div>
    </div>
  );
}

function TabDebito() {
  const [vista, setVista] = useState<'resumen' | 'movimientos'>('resumen');
  const [bancoFiltro, setBancoFiltro] = useState<string>('todos');
  const bancos = ['todos', ...Array.from(new Set(MOVS_DEBITO.map(m => m.banco)))];
  const movsFiltrados = bancoFiltro === 'todos' ? MOVS_DEBITO : MOVS_DEBITO.filter(m => m.banco === bancoFiltro);
  const totalDebito = BANCOS_DEBITO.reduce((s, b) => s + b.bruto, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setVista('resumen')} className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-colors ${vista === 'resumen' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-zinc-600 border-zinc-200 hover:border-sky-300'}`}>Por banco</button>
        <button onClick={() => setVista('movimientos')} className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-colors ${vista === 'movimientos' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-zinc-600 border-zinc-200 hover:border-sky-300'}`}>Movimientos</button>
      </div>

      {vista === 'resumen' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Total débito (marzo)" value={fmt(totalDebito)} sub={`${BANCOS_DEBITO.reduce((s,b)=>s+b.transacciones,0)} transacciones`} color="text-sky-700" />
            <StatCard label="Acreditación" value="D+1" sub="Siguiente día hábil" />
            <StatCard label="Comisión" value="$0" sub="Sin comisión en débito" color="text-emerald-600" />
          </div>

          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-50">
              <h3 className="text-sm font-semibold text-zinc-700">Clasificación por banco emisor</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Débito acredita directamente en tu cuenta el día hábil siguiente</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-400 border-b border-zinc-50">
                  <th className="px-5 py-2.5 text-left font-medium">Banco</th>
                  <th className="px-4 py-2.5 text-left font-medium">Red</th>
                  <th className="px-4 py-2.5 text-right font-medium">Trans.</th>
                  <th className="px-4 py-2.5 text-right font-medium">Monto vendido</th>
                  <th className="px-4 py-2.5 text-right font-medium">A acreditar</th>
                  <th className="px-4 py-2.5 text-right font-medium">Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {BANCOS_DEBITO.map(b => (
                  <tr key={b.banco + b.red} className="hover:bg-zinc-50/50">
                    <td className="px-5 py-3 font-medium text-zinc-800">{b.banco}</td>
                    <td className="px-4 py-3"><Pill color="bg-sky-100 text-sky-700">{b.red}</Pill></td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-500">{b.transacciones}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-800">{fmt(b.bruto)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">{fmt(b.neto)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-400">$0</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 bg-zinc-50/50 font-semibold">
                  <td colSpan={3} className="px-5 py-3 text-zinc-600">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-800">{fmt(totalDebito)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{fmt(totalDebito)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">$0</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {vista === 'movimientos' && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-50 flex items-center gap-3">
            <h3 className="text-sm font-semibold text-zinc-700">Movimientos de débito</h3>
            <div className="ml-auto flex gap-2">
              {bancos.map(b => (
                <button key={b} onClick={() => setBancoFiltro(b)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${bancoFiltro === b ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-zinc-500 border-zinc-200 hover:border-sky-300'}`}>
                  {b === 'todos' ? 'Todos' : b}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-50">
                <th className="px-5 py-2.5 text-left font-medium">Fecha</th>
                <th className="px-4 py-2.5 text-left font-medium">Banco</th>
                <th className="px-4 py-2.5 text-left font-medium">Red</th>
                <th className="px-4 py-2.5 text-right font-medium">Monto</th>
                <th className="px-4 py-2.5 text-center font-medium">Acreditación</th>
                <th className="px-4 py-2.5 text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {movsFiltrados.map((m, i) => (
                <tr key={i} className="hover:bg-zinc-50/50">
                  <td className="px-5 py-3 tabular-nums text-zinc-500">{m.fecha} <span className="text-zinc-300">{m.hora}</span></td>
                  <td className="px-4 py-3 font-medium text-zinc-800">{m.banco}</td>
                  <td className="px-4 py-3"><Pill color="bg-sky-100 text-sky-700">{m.red}</Pill></td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-800">{fmt(m.monto)}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-zinc-500">{m.acred}</td>
                  <td className="px-4 py-3 text-center">
                    {m.estado === 'acreditado'
                      ? <Pill color="bg-emerald-100 text-emerald-700">Acreditado</Pill>
                      : <Pill color="bg-amber-100 text-amber-700">Pendiente</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabCredito() {
  const [loteSelec, setLoteSelec] = useState<number | null>(null);
  const abiertos = LOTES.filter(l => l.estado === 'abierto');
  const cerrados = LOTES.filter(l => l.estado !== 'abierto');

  return (
    <div className="space-y-5">
      {/* Lotes abiertos */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-50 flex items-center gap-2">
          <Pill color="bg-amber-100 text-amber-700">Abiertos hoy</Pill>
          <h3 className="text-sm font-semibold text-zinc-700">Lotes pendientes de cierre</h3>
        </div>
        <div className="divide-y divide-zinc-50">
          {abiertos.map(l => {
            const com = l.bruto * l.comPct / 100;
            return (
              <div key={l.id} className={`px-5 py-4 flex items-center gap-4 transition-colors ${loteSelec === l.id ? 'bg-blue-50' : 'hover:bg-zinc-50/50'}`}>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-800">{l.terminal}</p>
                  <p className="text-xs text-zinc-400">{l.cant} transacciones · {l.fecha}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-zinc-800">{fmt(l.bruto)}</p>
                  <p className="text-xs text-zinc-400">−{fmt(com)} comisión ({l.comPct}%)</p>
                  <p className="text-xs font-semibold text-blue-700">{fmt(l.bruto - com)} neto</p>
                </div>
                <button
                  onClick={() => setLoteSelec(loteSelec === l.id ? null : l.id)}
                  className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Cerrar lote
                </button>
              </div>
            );
          })}
        </div>
        {loteSelec !== null && (
          <div className="px-5 py-4 bg-blue-50 border-t border-blue-100">
            <p className="text-sm font-semibold text-blue-800 mb-1">Confirmar cierre de lote</p>
            <p className="text-xs text-blue-600 mb-3">Se genera el informe de lote y se registra la fecha de acreditación estimada ({LOTES.find(l => l.id === loteSelec)?.acred}).</p>
            <div className="flex gap-2">
              <button className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors" onClick={() => setLoteSelec(null)}>Confirmar cierre</button>
              <button className="px-4 py-2 rounded-xl text-sm text-blue-600 hover:bg-blue-100 transition-colors" onClick={() => setLoteSelec(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Historial de lotes */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-50">
          <h3 className="text-sm font-semibold text-zinc-700">Historial de lotes</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-400 border-b border-zinc-50">
              <th className="px-5 py-2.5 text-left font-medium">Fecha</th>
              <th className="px-4 py-2.5 text-left font-medium">Terminal</th>
              <th className="px-4 py-2.5 text-right font-medium">Trans.</th>
              <th className="px-4 py-2.5 text-right font-medium">Bruto</th>
              <th className="px-4 py-2.5 text-right font-medium">Com.</th>
              <th className="px-4 py-2.5 text-right font-medium">Neto</th>
              <th className="px-4 py-2.5 text-center font-medium">Acred.</th>
              <th className="px-4 py-2.5 text-center font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {cerrados.map(l => {
              const com = l.bruto * l.comPct / 100;
              return (
                <tr key={l.id} className="hover:bg-zinc-50/50">
                  <td className="px-5 py-3 tabular-nums text-zinc-500">{l.fecha}</td>
                  <td className="px-4 py-3 font-medium text-zinc-800">{l.terminal}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-500">{l.cant}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-800">{fmt(l.bruto)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-500">−{fmt(com)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-blue-700">{fmt(l.bruto - com)}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-zinc-500">{l.acred}</td>
                  <td className="px-4 py-3 text-center">
                    {l.estado === 'acreditado'
                      ? <Pill color="bg-emerald-100 text-emerald-700">Acreditado</Pill>
                      : <Pill color="bg-zinc-100 text-zinc-600">Cerrado</Pill>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabComparacion() {
  const [periodo, setPeriodo] = useState('Mar 2026');
  const periodos = Array.from(new Set(COMPARACION.map(c => c.periodo)));
  const filas = COMPARACION.filter(c => c.periodo === periodo);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {periodos.map(p => (
          <button key={p} onClick={() => setPeriodo(p)} className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-colors ${periodo === p ? 'bg-[var(--brand-purple)] text-white border-transparent' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>{p}</button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-50">
          <h3 className="text-sm font-semibold text-zinc-700">Comparación de cierre al vencimiento — {periodo}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Contrasta lo vendido con lo efectivamente recibido en cuenta</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-400 border-b border-zinc-50">
              <th className="px-5 py-2.5 text-left font-medium">Banco / Red</th>
              <th className="px-4 py-2.5 text-right font-medium">Vendido</th>
              <th className="px-4 py-2.5 text-right font-medium">Com. %</th>
              <th className="px-4 py-2.5 text-right font-medium">Neto esperado</th>
              <th className="px-4 py-2.5 text-right font-medium">Neto recibido</th>
              <th className="px-4 py-2.5 text-right font-medium">Diferencia</th>
              <th className="px-4 py-2.5 text-center font-medium">Fecha acred.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filas.map((c, i) => {
              const diff = c.recibido === 0 ? null : c.recibido - c.esperado;
              const diffFmt = diff !== null ? fmtDiff(diff) : null;
              return (
                <tr key={i} className={`hover:bg-zinc-50/50 ${diff !== null && diff < 0 ? 'bg-rose-50/40' : ''}`}>
                  <td className="px-5 py-3 font-medium text-zinc-800">{c.banco}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{fmt(c.vendido)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-500">{c.comPct}%</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-800">{fmt(c.esperado)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {c.recibido === 0
                      ? <span className="text-zinc-300">— pendiente</span>
                      : <span className="text-zinc-800">{fmt(c.recibido)}</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {diffFmt
                      ? <span className={diffFmt.cls}>{diffFmt.text}</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-zinc-500">{c.fechaAcred}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 bg-zinc-50/50 font-semibold text-sm">
              <td className="px-5 py-3 text-zinc-600">Total</td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">{fmt(filas.reduce((s,c)=>s+c.vendido,0))}</td>
              <td />
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">{fmt(filas.reduce((s,c)=>s+c.esperado,0))}</td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">{fmt(filas.filter(c=>c.recibido>0).reduce((s,c)=>s+c.recibido,0))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {filas.some(c => c.recibido > 0 && c.recibido !== c.esperado) && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 text-sm text-rose-800 flex items-start gap-3">
          <svg className="shrink-0 mt-0.5" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16">
            <path d="M8 1.5L14.5 13H1.5L8 1.5z" /><line x1="8" y1="6" x2="8" y2="9.5" strokeWidth="2" /><line x1="8" y1="11" x2="8" y2="11.5" strokeWidth="2" />
          </svg>
          <span>Hay diferencias entre el neto esperado y el neto recibido. Revisar cierres con el banco correspondiente.</span>
        </div>
      )}
    </div>
  );
}

function TabContabilidad() {
  const totalIngresos = Object.values(BALANCE.ingresos).reduce((a, b) => a + b, 0);
  const totalEgresos  = Object.values(BALANCE.egresos).reduce((a, b) => a + b, 0);
  const neto = totalIngresos - totalEgresos;
  const tcUSD = 43.5;

  const ingRows = [
    { label: 'Efectivo',      value: BALANCE.ingresos.efectivo,      cls: 'text-emerald-700' },
    { label: 'Débito',        value: BALANCE.ingresos.debito,        cls: 'text-sky-700' },
    { label: 'Crédito',       value: BALANCE.ingresos.credito,       cls: 'text-blue-700' },
    { label: 'Transferencia', value: BALANCE.ingresos.transferencia, cls: 'text-violet-700' },
  ];
  const egrRows = [
    { label: 'Compras a proveedores', value: BALANCE.egresos.compras,  cls: 'text-rose-600' },
    { label: 'Ajustes / descuentos',  value: BALANCE.egresos.ajustes,  cls: 'text-rose-400' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Ingresos totales" value={fmt(totalIngresos)} sub={`USD ${(totalIngresos / tcUSD).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`} color="text-emerald-700" />
        <StatCard label="Egresos totales"  value={fmt(totalEgresos)}  sub={`USD ${(totalEgresos / tcUSD).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`} color="text-rose-600" />
        <StatCard label="Resultado neto"   value={fmt(neto)}          sub={`USD ${(neto / tcUSD).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`} color={neto >= 0 ? 'text-emerald-700' : 'text-rose-600'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ingresos */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-700">Ingresos — {BALANCE.periodo}</h3>
          </div>
          <div className="divide-y divide-zinc-50">
            {ingRows.map(r => (
              <div key={r.label} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-zinc-600">{r.label}</span>
                <div className="text-right">
                  <span className={`text-sm font-semibold tabular-nums ${r.cls}`}>{fmt(r.value)}</span>
                  <span className="text-xs text-zinc-300 ml-2">≈ USD {(r.value / tcUSD).toFixed(0)}</span>
                </div>
              </div>
            ))}
            <div className="px-5 py-3 flex items-center justify-between bg-emerald-50/50">
              <span className="text-sm font-bold text-zinc-700">Total ingresos</span>
              <span className="text-sm font-bold tabular-nums text-emerald-700">{fmt(totalIngresos)}</span>
            </div>
          </div>
        </div>

        {/* Egresos */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <h3 className="text-sm font-semibold text-zinc-700">Egresos — {BALANCE.periodo}</h3>
          </div>
          <div className="divide-y divide-zinc-50">
            {egrRows.map(r => (
              <div key={r.label} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-zinc-600">{r.label}</span>
                <div className="text-right">
                  <span className={`text-sm font-semibold tabular-nums ${r.cls}`}>{fmt(r.value)}</span>
                  <span className="text-xs text-zinc-300 ml-2">≈ USD {(r.value / tcUSD).toFixed(0)}</span>
                </div>
              </div>
            ))}
            <div className="px-5 py-3 flex items-center justify-between bg-rose-50/50">
              <span className="text-sm font-bold text-zinc-700">Total egresos</span>
              <span className="text-sm font-bold tabular-nums text-rose-600">{fmt(totalEgresos)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className={`rounded-2xl border px-5 py-4 flex items-center justify-between ${neto >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-1">RESULTADO NETO — {BALANCE.periodo}</p>
          <p className={`text-3xl font-bold tabular-nums ${neto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(neto)}</p>
          <p className="text-sm text-zinc-400 mt-0.5">≈ USD {(neto / tcUSD).toFixed(0)} · TC ${tcUSD}/USD</p>
        </div>
        <button className="px-5 py-2 rounded-xl text-sm font-semibold bg-zinc-800 text-white hover:bg-zinc-700 transition-colors">Exportar PDF</button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800 flex items-start gap-3">
        <svg className="shrink-0 mt-0.5" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6.5" /><line x1="8" y1="5" x2="8" y2="8.5" strokeWidth="2" /><line x1="8" y1="10.5" x2="8" y2="11" strokeWidth="2" />
        </svg>
        <span><strong>Prototipo:</strong> Tipo de cambio y egresos actualizables. Exportación PDF/CSV se implementa en la siguiente etapa. Los datos son de ejemplo.</span>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ContabilidadPage() {
  const [tab, setTab] = useState<Tab>('resumen');

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center gap-4 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Contabilidad</h1>
          <p className="text-xs text-zinc-400">Medios de pago · débito · crédito · cierre de lotes</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select className="text-sm border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-600 bg-white focus:outline-none focus:border-[var(--brand-purple)]">
            <option>Marzo 2026</option>
            <option>Febrero 2026</option>
            <option>Enero 2026</option>
          </select>
          <button className="px-4 py-1.5 rounded-xl text-sm font-medium border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 transition-colors">Exportar</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-zinc-100 px-6 flex gap-1 shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-[var(--brand-purple)] text-[var(--brand-purple)]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'resumen'      && <TabResumen />}
        {tab === 'debito'       && <TabDebito />}
        {tab === 'credito'      && <TabCredito />}
        {tab === 'comparacion'  && <TabComparacion />}
        {tab === 'contabilidad' && <TabContabilidad />}
      </div>
    </div>
  );
}
