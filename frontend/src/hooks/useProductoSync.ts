'use client';
import { useEffect, useRef, useCallback } from 'react';

const CHANNEL = 'zamoritos-stock';

export interface StockEvent {
  productoId: number;
  newStock:   number;
}

/**
 * Publica cambios de stock hacia otras tabs del mismo origen.
 * Usar en la página de Productos, después de cada ajuste exitoso.
 */
export function useStockPublisher() {
  const ch = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    ch.current = new BroadcastChannel(CHANNEL);
    return () => { ch.current?.close(); ch.current = null; };
  }, []);

  return useCallback((productoId: number, newStock: number) => {
    ch.current?.postMessage({ productoId, newStock } as StockEvent);
  }, []);
}

/**
 * Suscribe a cambios de stock publicados por otras tabs.
 * Usar en la página de Ventas para mantener el stock sincronizado.
 */
export function useStockSubscriber(onUpdate: (ev: StockEvent) => void) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e: MessageEvent<StockEvent>) => {
      if (e.data?.productoId != null) cbRef.current(e.data);
    };
    return () => ch.close();
  }, []);
}

/**
 * Refetch silencioso cuando la tab recupera el foco (Page Visibility API).
 * Complemento al BroadcastChannel para el caso en que las dos tabs no estaban
 * abiertas simultáneamente.
 */
export function useRefetchOnFocus(refetch: () => void) {
  const cbRef = useRef(refetch);
  cbRef.current = refetch;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { if (!document.hidden) cbRef.current(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
}
