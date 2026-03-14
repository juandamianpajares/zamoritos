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
  stock: number;
  activo: boolean;
}

export interface Proveedor {
  id: number;
  nombre: string;
  rut?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
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

export interface DashboardStats {
  total_productos: number;
  total_proveedores: number;
  total_compras: number;
  stock_bajo_count: number;
  proximos_vencer_count: number;
  productos_stock_bajo: Producto[];
  proximos_vencer: Lote[];
}
