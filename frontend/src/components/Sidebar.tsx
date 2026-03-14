'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DashboardIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 16 16">
    <rect x="1" y="1" width="6" height="6" rx="1.5" />
    <rect x="9" y="1" width="6" height="6" rx="1.5" />
    <rect x="1" y="9" width="6" height="6" rx="1.5" />
    <rect x="9" y="9" width="6" height="6" rx="1.5" />
  </svg>
);

const BoxIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 16 16">
    <path d="M13.5 4.5L8 2 2.5 4.5v7L8 14l5.5-2.5v-7z" />
    <path d="M2.5 4.5L8 7l5.5-2.5M8 7v7" />
  </svg>
);

const TagIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 16 16">
    <path d="M1.5 1.5h5l7 7-5 5-7-7v-5z" />
    <circle cx="4.5" cy="4.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const TruckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 16 16">
    <rect x="1" y="3" width="10" height="8" rx="1" />
    <path d="M11 6h2.5L15 9v2h-1" />
    <circle cx="4" cy="12.5" r="1.5" />
    <circle cx="12" cy="12.5" r="1.5" />
  </svg>
);

const BagIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 16 16">
    <path d="M2.5 5.5h11l-1 8h-9l-1-8z" />
    <path d="M5.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" />
  </svg>
);

const ChartIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 16 16">
    <line x1="1" y1="14" x2="15" y2="14" />
    <rect x="2" y="8" width="3" height="6" rx="0.5" />
    <rect x="6.5" y="4" width="3" height="10" rx="0.5" />
    <rect x="11" y="6" width="3" height="8" rx="0.5" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 16 16">
    <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" />
    <line x1="1.5" y1="6.5" x2="14.5" y2="6.5" />
    <line x1="5" y1="1" x2="5" y2="4" />
    <line x1="11" y1="1" x2="11" y2="4" />
  </svg>
);

const CashIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 16 16">
    <rect x="1" y="4" width="14" height="8" rx="1.5" />
    <circle cx="8" cy="8" r="2" />
    <line x1="4" y1="8" x2="4" y2="8.01" strokeWidth="2" />
    <line x1="12" y1="8" x2="12" y2="8.01" strokeWidth="2" />
  </svg>
);

const links = [
  { href: '/',            label: 'Dashboard',   Icon: DashboardIcon },
  { href: '/ventas',      label: 'Ventas',      Icon: CashIcon,     highlight: true },
  { href: '/productos',   label: 'Productos',   Icon: BoxIcon },
  { href: '/categorias',  label: 'Categorías',  Icon: TagIcon },
  { href: '/proveedores', label: 'Proveedores', Icon: TruckIcon },
  { href: '/compras',     label: 'Compras',     Icon: BagIcon },
  { href: '/stock',       label: 'Stock',       Icon: ChartIcon },
  { href: '/lotes',       label: 'Lotes',       Icon: CalendarIcon },
];

interface NavLink {
  href: string;
  label: string;
  Icon: () => JSX.Element;
  highlight?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const path = usePathname();

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-30 w-56 bg-zinc-950 flex flex-col shrink-0 transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="px-5 py-5 border-b border-zinc-800/60">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Agroveterinaria</p>
        <h1 className="text-base font-semibold text-white tracking-tight">Zamoritos</h1>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {(links as NavLink[]).map(({ href, label, Icon, highlight }) => {
          const active = path === href || (href !== '/' && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-white/10 text-white'
                  : highlight
                  ? 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <Icon />
              <span className={active ? 'font-medium' : ''}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-zinc-800/60">
        <p className="text-[11px] text-zinc-600">v1.0</p>
      </div>
    </aside>
  );
}
