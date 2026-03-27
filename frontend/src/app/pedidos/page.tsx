'use client';

import { useState } from 'react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

type EstadoPedido = 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';

interface Pedido {
  id: number;
  cliente: string;
  telefono: string;
  direccion: string;
  fecha: string;
  estado: EstadoPedido;
  productos: { nombre: string; cantidad: number; precio: number }[];
  envio: number;
  medio: string;
  notas?: string;
}

const MOCK_PEDIDOS: Pedido[] = [
  {
    id: 1001, cliente: 'María González', telefono: '099 123 456', direccion: 'Av. Italia 1234, Montevideo',
    fecha: '27/03/2026', estado: 'pendiente',
    productos: [
      { nombre: 'Alimento Perro Adulto 15kg', cantidad: 2, precio: 1850 },
      { nombre: 'Collar antiparasitario', cantidad: 1, precio: 480 },
    ],
    envio: 150, medio: 'transferencia', notas: 'Dejar en portería',
  },
  {
    id: 1002, cliente: 'Carlos Pérez', telefono: '098 765 432', direccion: 'Bvar. Artigas 567, Montevideo',
    fecha: '27/03/2026', estado: 'confirmado',
    productos: [
      { nombre: 'Alimento Gato Esterilizado 3kg', cantidad: 3, precio: 690 },
    ],
    envio: 100, medio: 'efectivo',
  },
  {
    id: 1003, cliente: 'Ana Rodríguez', telefono: '091 234 567', direccion: 'Maldonado 890, Pocitos',
    fecha: '26/03/2026', estado: 'enviado',
    productos: [
      { nombre: 'Pipeta antipulgas perro grande', cantidad: 2, precio: 320 },
      { nombre: 'Champú medicado 250ml', cantidad: 1, precio: 580 },
    ],
    envio: 120, medio: 'tarjeta',
  },
  {
    id: 1004, cliente: 'Luis Martínez', telefono: '092 345 678', direccion: 'Rbla. República 120, Carrasco',
    fecha: '26/03/2026', estado: 'entregado',
    productos: [
      { nombre: 'Arena sanitaria aglomerante 10kg', cantidad: 4, precio: 420 },
      { nombre: 'Comedero acero inox', cantidad: 1, precio: 890 },
    ],
    envio: 200, medio: 'efectivo',
  },
  {
    id: 1005, cliente: 'Sofía Vidal', telefono: '094 456 789', direccion: 'Jackson 345, Parque Batlle',
    fecha: '25/03/2026', estado: 'cancelado',
    productos: [
      { nombre: 'Vacuna rabia + desparasitación', cantidad: 1, precio: 1200 },
    ],
    envio: 0, medio: 'transferencia', notas: 'Cliente canceló por cambio de fecha',
  },
];

const ESTADO_CFG: Record<EstadoPedido, { label: string; pill: string; dot: string; next?: EstadoPedido; nextLabel?: string }> = {
  pendiente:  { label: 'Pendiente',  pill: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400',   next: 'confirmado', nextLabel: 'Confirmar' },
  confirmado: { label: 'Confirmado', pill: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',    next: 'enviado',    nextLabel: 'Marcar enviado' },
  enviado:    { label: 'Enviado',    pill: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400',  next: 'entregado',  nextLabel: 'Confirmar entrega' },
  entregado:  { label: 'Entregado', pill: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500', },
  cancelado:  { label: 'Cancelado', pill: 'bg-zinc-100 text-zinc-500',      dot: 'bg-zinc-300',    },
};

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{children}</span>;
}

function PedidoDetalle({ pedido, onClose, onAvanzar }: { pedido: Pedido; onClose: () => void; onAvanzar: (id: number, e: EstadoPedido) => void }) {
  const cfg = ESTADO_CFG[pedido.estado];
  const subtotal = pedido.productos.reduce((s, p) => s + p.cantidad * p.precio, 0);
  const total = subtotal + pedido.envio;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h3 className="font-bold text-zinc-900">Pedido #{pedido.id}</h3>
            <p className="text-xs text-zinc-400">{pedido.fecha}</p>
          </div>
          <Pill color={cfg.pill}>{cfg.label}</Pill>
          <button onClick={onClose} className="ml-3 text-zinc-300 hover:text-zinc-500">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="15" y2="15"/><line x1="15" y1="1" x2="1" y2="15"/></svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Cliente */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Cliente</p>
            <p className="text-sm font-semibold text-zinc-800">{pedido.cliente}</p>
            <p className="text-sm text-zinc-500">{pedido.telefono}</p>
            <p className="text-sm text-zinc-500">{pedido.direccion}</p>
          </div>

          {/* Productos */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Productos</p>
            <div className="space-y-1.5">
              {pedido.productos.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-zinc-700">{p.cantidad}× {p.nombre}</span>
                  <span className="tabular-nums font-medium text-zinc-800">{fmt(p.cantidad * p.precio)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="border-t border-zinc-100 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span>
            </div>
            {pedido.envio > 0 && (
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Envío</span><span className="tabular-nums">{fmt(pedido.envio)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-zinc-900 pt-1 border-t border-zinc-100">
              <span>Total</span><span className="tabular-nums">{fmt(total)}</span>
            </div>
            <p className="text-xs text-zinc-400 capitalize">Pago: {pedido.medio}</p>
          </div>

          {pedido.notas && (
            <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-800">
              <span className="font-medium">Nota: </span>{pedido.notas}
            </div>
          )}
        </div>

        {cfg.next && (
          <div className="px-5 py-4 border-t border-zinc-100 flex gap-2">
            <button
              onClick={() => { onAvanzar(pedido.id, cfg.next!); onClose(); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[var(--brand-purple)] text-white hover:opacity-90 transition-opacity"
            >
              {cfg.nextLabel}
            </button>
            <button
              onClick={() => { onAvanzar(pedido.id, 'cancelado'); onClose(); }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200 text-zinc-500 hover:border-rose-200 hover:text-rose-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PedidosPage() {
  const [pedidos, setPedidos]   = useState<Pedido[]>(MOCK_PEDIDOS);
  const [filtro, setFiltro]     = useState<EstadoPedido | 'todos'>('todos');
  const [selec, setSelec]       = useState<Pedido | null>(null);
  const [busq, setBusq]         = useState('');

  const filtrados = pedidos.filter(p => {
    if (filtro !== 'todos' && p.estado !== filtro) return false;
    if (busq && !p.cliente.toLowerCase().includes(busq.toLowerCase())) return false;
    return true;
  });

  const avanzar = (id: number, nuevoEstado: EstadoPedido) => {
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p));
  };

  const conteo = (e: EstadoPedido | 'todos') =>
    e === 'todos' ? pedidos.length : pedidos.filter(p => p.estado === e).length;

  const FILTROS: { id: EstadoPedido | 'todos'; label: string }[] = [
    { id: 'todos',      label: 'Todos' },
    { id: 'pendiente',  label: 'Pendientes' },
    { id: 'confirmado', label: 'Confirmados' },
    { id: 'enviado',    label: 'Enviados' },
    { id: 'entregado',  label: 'Entregados' },
    { id: 'cancelado',  label: 'Cancelados' },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center gap-4 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Pedidos</h1>
          <p className="text-xs text-zinc-400">Gestión de envíos y entregas</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busq}
            onChange={e => setBusq(e.target.value)}
            className="text-sm border border-zinc-200 rounded-xl px-3 py-1.5 w-44 focus:outline-none focus:border-[var(--brand-purple)] bg-white"
          />
          <button className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-[var(--brand-purple)] text-white hover:opacity-90 transition-opacity">
            + Nuevo pedido
          </button>
        </div>
      </div>

      {/* Filtros de estado */}
      <div className="bg-white border-b border-zinc-100 px-6 flex gap-1 shrink-0 overflow-x-auto">
        {FILTROS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              filtro === f.id
                ? 'border-[var(--brand-purple)] text-[var(--brand-purple)]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {f.label}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${filtro === f.id ? 'bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]' : 'bg-zinc-100 text-zinc-400'}`}>
              {conteo(f.id)}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtrados.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-sm text-zinc-400">No hay pedidos en este estado.</p>
          </div>
        )}
        {filtrados.map(p => {
          const cfg = ESTADO_CFG[p.estado];
          const total = p.productos.reduce((s, pr) => s + pr.cantidad * pr.precio, 0) + p.envio;
          return (
            <div
              key={p.id}
              onClick={() => setSelec(p)}
              className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 flex items-center gap-4 hover:border-zinc-200 hover:shadow-md transition-all cursor-pointer"
            >
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-800">{p.cliente}</p>
                  <Pill color={cfg.pill}>{cfg.label}</Pill>
                </div>
                <p className="text-xs text-zinc-400 truncate">{p.direccion}</p>
                <p className="text-xs text-zinc-300 mt-0.5">{p.productos.length} producto{p.productos.length !== 1 ? 's' : ''} · {p.fecha}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums text-zinc-800">{fmt(total)}</p>
                {p.envio > 0 && <p className="text-xs text-zinc-400">+{fmt(p.envio)} envío</p>}
                <p className="text-xs text-zinc-300 capitalize">{p.medio}</p>
              </div>
              {cfg.next && (
                <button
                  onClick={e => { e.stopPropagation(); avanzar(p.id, cfg.next!); }}
                  className="ml-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-600 hover:bg-[var(--brand-purple)] hover:text-white transition-colors whitespace-nowrap"
                >
                  {cfg.nextLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Prototipo banner */}
      <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 text-center shrink-0">
        Prototipo visual — datos de ejemplo · Integración con ventas y clientes en siguiente etapa
      </div>

      {selec && (
        <PedidoDetalle
          pedido={selec}
          onClose={() => setSelec(null)}
          onAvanzar={avanzar}
        />
      )}
    </div>
  );
}
