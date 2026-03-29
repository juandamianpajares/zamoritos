export const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';

/** URL base del servidor (sin /api) — para construir rutas de /storage */
export const STORAGE_BASE = BASE.startsWith('http')
  ? BASE.replace(/\/api$/, '')
  : '';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('Content-Type') ?? '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`El servidor devolvió una respuesta inesperada (HTTP ${res.status}). Verificá los logs del backend.\n${text.slice(0, 300)}`);
  }

  const json = await res.json();
  if (!res.ok) {
    const msg =
      json?.message ??
      Object.values(json?.errors ?? {}).flat().join(', ') ??
      'Error en la solicitud';
    throw new Error(msg as string);
  }
  return json as T;
}

async function reqForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.message ?? Object.values(json?.errors ?? {}).flat().join(', ') ?? 'Error';
    throw new Error(msg as string);
  }
  return json as T;
}

export const api = {
  get:      <T>(path: string)                  => req<T>('GET',    path),
  post:     <T>(path: string, body: unknown)   => req<T>('POST',   path, body),
  put:      <T>(path: string, body: unknown)   => req<T>('PUT',    path, body),
  patch:    <T>(path: string, body: unknown)   => req<T>('PATCH',  path, body),
  delete:   <T>(path: string)                  => req<T>('DELETE', path),
  postForm: <T>(path: string, form: FormData)  => reqForm<T>(path, form),
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  /** Tags de filtrado: animales (perro|gato|ave|granja|conejo|pez|todos) y tipo (alimento|higiene|accesorio|sanitario|medicamento|parasitos|hogar|paseo) */
  tags?: string[];
  foto?: string;
  foto_url?: string;
  parent_id?: number;
  children?: Categoria[];
}

export interface ComboItem {
  id?: number;
  componente_producto_id: number;
  cantidad: number;
  componente?: Producto;
}

export interface Producto {
  id: number;
  codigo_barras?: string;
  nombre: string;
  marca?: string;
  categoria_id?: number;
  categoria?: Categoria;
  peso?: number;
  unidad_medida: string;
  precio_venta: number;
  precio_compra?: number;
  stock: number;
  activo: boolean;
  notificar_stock_bajo?: boolean;
  destacado?: boolean;
  fraccionado_de?: number;
  fraccionable?: boolean;
  modo_fraccion?: 'kg' | 'unidad';
  /** 0=sin promo | 1=COMBO | 2=OFERTA | 3=REGALO */
  en_promo?: 0 | 1 | 2 | 3;
  combo_items?: ComboItem[];
  precio_promo?: number;
  promo_producto_id?: number;
  promo_producto?: Producto;
  foto?: string;
  thumb?: string;
  foto_url?: string;   // accessor: URL completa (storage local o externa)
  thumb_url?: string;  // accessor: URL completa del thumbnail
}

export interface FraccionarResult {
  original:           Producto;
  fraccionado:        Producto;
  unidades_generadas: number;
  codigo_fraccionado: string;
  modo_fraccion?:     'kg' | 'unidad';
}

export interface Proveedor {
  id: number;
  nombre: string;
  rut?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
  notas?: string;
  activo: boolean;
  saldo_manual?: number;
  saldo_compras?: number;
  saldo_a_favor?: number;
  saldo_total?: number;
}

export interface DetalleCompra {
  id: number;
  producto_id: number;
  producto?: Producto;
  cantidad: number;
  precio_compra: number;
  subtotal: number;
}

export interface PagoProveedor {
  id: number;
  proveedor_id: number;
  proveedor?: Proveedor;
  compra_id?: number;
  compra?: Compra;
  tipo: 'pre_compra' | 'contado' | 'cuota';
  monto: number;
  fecha: string;
  medio_pago: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  referencia?: string;
  nota?: string;
  usuario?: string;
}

export interface Compra {
  id: number;
  fecha: string;
  proveedor_id?: number;
  proveedor?: Proveedor;
  factura?: string;
  total: number;
  usuario?: string;
  nota?: string;
  tipo_pago: 'contado' | 'diferido';
  dias_plazo: number;
  fecha_vencimiento?: string;
  estado_pago: 'pagado' | 'pendiente' | 'parcial';
  monto_pagado: number;
  saldo?: number;
  detalles?: DetalleCompra[];
  pagos?: PagoProveedor[];
}

export interface CuentasPagar {
  total_pendiente: number;
  compras: (Compra & { saldo: number })[];
}

export interface MovimientoStock {
  id: number;
  producto_id: number;
  producto?: Producto;
  tipo: 'ingreso' | 'venta' | 'venta_suelta' | 'ajuste' | 'vencimiento';
  cantidad: number;
  fecha: string;
  referencia?: string;
  usuario?: string;
  observacion?: string;
}

export interface Lote {
  id: number;
  producto_id: number;
  producto?: Producto;
  compra_id?: number;
  fecha_ingreso: string;
  fecha_vencimiento?: string;
  cantidad: number;
  cantidad_restante: number;
}

export interface BalanceCategoriaProducto {
  id: number;
  nombre: string;
  codigo_barras?: string;
  stock: number;
  unidad_medida: string;
  precio_compra?: number;
  precio_venta: number;
}

export interface BalanceCategoriaSubcat {
  nombre: string;
  total_productos: number;
  stock_total: number;
  valor_inventario: number;
  agotados: number;
  productos: BalanceCategoriaProducto[];
}

export interface BalanceCategoria {
  categoria: string;
  total_productos: number;
  stock_total: number;
  valor_inventario: number;
  agotados: number;
  subcategorias: BalanceCategoriaSubcat[];
}

export interface DetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  producto?: Producto;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
}

export interface MedioPagoItem {
  medio: string;
  monto: number;
}

export interface Venta {
  id: number;
  fecha: string;
  tipo_pago: 'contado' | 'credito';
  medio_pago?: string;
  medios_pago?: MedioPagoItem[];
  receptor_nombre?: string;
  moneda: string;
  subtotal: number;
  descuento: number;
  costo_envio?: number;
  total: number;
  estado: 'confirmada' | 'anulada';
  tipo_comprobante?: string;  // Kitfe v2
  numero_factura?: string;
  kitfe_id?: string;          // Kitfe v2
  usuario?: string;
  observacion?: string;
  detalles?: DetalleVenta[];
}

export interface VentasPaginado {
  data: Venta[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface DashboardStats {
  total_productos: number;
  total_proveedores: number;
  total_compras: number;
  stock_bajo_count: number;
  proximos_vencer_count: number;
  productos_stock_bajo: Producto[];
  proximos_vencer: Lote[];
}

export interface MedioPagoStat {
  medio: string;
  total: number;
  cantidad: number;
}

export interface VentasDia {
  fecha: string;
  total: number;
  cantidad: number;
  ticket_promedio: number;
  por_medio_pago: MedioPagoStat[];
  con_factura: { cantidad: number; total: number };
  sin_factura: { cantidad: number; total: number };
  ventas: Venta[];
}

export interface TopProductoItem {
  producto_id: number;
  nombre: string;
  categoria?: string;
  unidad_medida: string;
  total_unidades: number;
  total_ingresos: number;
}

export interface TopProductos {
  periodo: 'hoy' | 'semana' | 'mes';
  desde: string;
  top: TopProductoItem[];
}

export interface VentasSemanaItem {
  fecha: string;
  total: number;
  cantidad: number;
  ganancia_neta: number;
}

export interface StockMovimientoItem {
  fecha: string;
  ingresos: number;
  egresos: number;
}

export interface GananciaProveedorItem {
  proveedor: string;
  total_ventas: number;
  total_costo: number;
  ganancia: number;
  margen_pct: number;
}

export interface CajaMedioPago {
  medio: string;
  total: number;
  cantidad: number;
}

export interface ArqueoCaja {
  id?: number;
  fecha: string;
  denominaciones: Record<string, number>;
  fondo_cambio: number;
  total_contado: number;
  total_esperado: number;
  diferencia: number;
  observacion?: string;
}

export interface VencimientoHoy {
  id: number;
  proveedor: string;
  total: number;
  saldo: number;
  factura?: string;
  vencimiento: string;
}

export interface CajaDia {
  fecha: string;
  total_ventas: number;
  cantidad_ventas: number;
  ventas_por_medio: CajaMedioPago[];
  total_compras: number;       // solo contado — egreso real del día
  cantidad_compras: number;
  total_diferido: number;      // compras diferidas registradas hoy
  cantidad_diferido: number;
  compras_por_prov: { proveedor: string; total: number; cantidad: number }[];
  compras: Compra[];
  vencimientos_hoy: VencimientoHoy[];
  arqueo: ArqueoCaja | null;
}

export interface ArqueoHistorico {
  fecha: string;
  total_contado: number;
  total_esperado: number;
  diferencia: number;
  fondo_cambio: number;
  observacion?: string;
  total_ventas: number;
  cant_ventas: number;
  total_compras: number;
}

export interface GananciaDashboard {
  periodo: string;
  desde: string;
  total_ventas: number;
  total_compras: number;
  total_costo: number;
  ganancia_neta: number;
  margen_pct: number;
  por_proveedor: GananciaProveedorItem[];
}

// ── Clientes ──────────────────────────────────────────────────────────────────
export interface Cliente {
  id: number;
  codigo: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
}

// ── Pedidos ───────────────────────────────────────────────────────────────────
export type EstadoPedido = 'pendiente' | 'preparando' | 'confirmado' | 'sin_facturar' | 'enviado' | 'entregado' | 'cancelado';

export interface DetallePedido {
  id?: number;
  producto_id?: number | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Pedido {
  id: number;
  venta_id?: number | null;
  numero: string;
  fecha: string;
  estado: EstadoPedido;
  costo_envio: number;
  medio_pago?: string;
  notas?: string;
  tipo_cancelacion?: 'anulacion' | 'devolucion' | 'cancelado_entrega' | null;
  saldo_faltante?: number;
  whatsapp_enviado?: boolean | null;
  whatsapp_enviado_at?: string | null;
  subtotal: number;
  total: number;
  cliente: {
    id: number;
    codigo: string;
    nombre: string;
    telefono?: string;
    direccion?: string;
  };
  detalles: DetallePedido[];
}
