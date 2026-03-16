const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  if (res.status === 204) return undefined as T;

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

export const api = {
  get:    <T>(path: string)                  => req<T>('GET',    path),
  post:   <T>(path: string, body: unknown)   => req<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown)   => req<T>('PUT',    path, body),
  patch:  <T>(path: string, body: unknown)   => req<T>('PATCH',  path, body),
  delete: <T>(path: string)                  => req<T>('DELETE', path),
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface Categoria {
  id: number;
  nombre: string;
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
  fraccionado_de?: number;
  en_promo?: boolean;
  precio_promo?: number;
  foto?: string;
  foto_url?: string;
}

export interface FraccionarResult {
  original:           Producto;
  fraccionado:        Producto;
  unidades_generadas: number;
  codigo_fraccionado: string;
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
}

export interface DetalleCompra {
  id: number;
  producto_id: number;
  producto?: Producto;
  cantidad: number;
  precio_compra: number;
  subtotal: number;
}

export interface Compra {
  id: number;
  fecha: string;
  proveedor_id?: number;
  proveedor?: Proveedor;
  factura?: string;
  total: number;
  usuario?: string;
  detalles?: DetalleCompra[];
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
  total: number;
  estado: 'confirmada' | 'anulada';
  tipo_comprobante?: string;  // Kitfe v2
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

export interface CajaDia {
  fecha: string;
  total_ventas: number;
  cantidad_ventas: number;
  ventas_por_medio: CajaMedioPago[];
  total_compras: number;
  cantidad_compras: number;
  compras_por_prov: { proveedor: string; total: number; cantidad: number }[];
  compras: Compra[];
}

export interface GananciaDashboard {
  periodo: string;
  desde: string;
  total_ventas: number;
  total_costo: number;
  ganancia_neta: number;
  margen_pct: number;
  por_proveedor: GananciaProveedorItem[];
}
