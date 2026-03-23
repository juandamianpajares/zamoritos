'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const PAGE_TITLES: Record<string, string> = {
  '/':               'Dashboard',
  '/ventas':         'Ventas',
  '/caja':           'Caja',
  '/productos':      'Productos',
  '/categorias':     'Categorías',
  '/proveedores':    'Proveedores',
  '/compras':        'Compras',
  '/cuentas-pagar':  'Cuentas a pagar',
  '/stock':          'Stock',
  '/lotes':          'Lotes',
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? 'Zamoritos';

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Cerrar sidebar al navegar
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl hover:bg-zinc-100 text-zinc-600 transition-colors active:bg-zinc-200"
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="5" x2="18" y2="5" />
              <line x1="2" y1="10" x2="18" y2="10" />
              <line x1="2" y1="15" x2="18" y2="15" />
            </svg>
          </button>
          <span className="text-base font-semibold text-zinc-900 tracking-tight">{pageTitle}</span>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
      </div>
    </div>
  );
}
