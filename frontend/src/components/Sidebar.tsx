'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/',            label: 'Dashboard',   icon: '🏠' },
  { href: '/productos',   label: 'Productos',   icon: '📦' },
  { href: '/categorias',  label: 'Categorías',  icon: '🏷️' },
  { href: '/proveedores', label: 'Proveedores', icon: '🏭' },
  { href: '/compras',     label: 'Compras',     icon: '🛒' },
  { href: '/stock',       label: 'Stock',       icon: '📊' },
  { href: '/lotes',       label: 'Lotes',       icon: '⏰' },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-blue-800 text-white flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-blue-700">
        <p className="text-xs uppercase tracking-widest text-blue-300 mb-1">Agroveterinaria</p>
        <h1 className="text-xl font-bold">Zamoritos</h1>
      </div>

      <nav className="flex-1 py-4">
        {links.map(({ href, label, icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                active
                  ? 'bg-blue-900 text-white font-semibold border-l-4 border-white'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-blue-700 text-xs text-blue-300">
        Sistema de Gestión v1.0
      </div>
    </aside>
  );
}
