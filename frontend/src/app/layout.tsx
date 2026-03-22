import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Zamoritos – Gestión',
  description: 'Sistema de gestión comercial y stock · Agroveterinaria Zamoritos',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zamoritos',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-50 min-h-screen text-zinc-900 antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
