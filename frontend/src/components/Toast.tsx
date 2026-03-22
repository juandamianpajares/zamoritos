'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  /** Duración en ms antes de auto-cerrar. 0 = no auto-cierra. Default: 3500 */
  duration?: number;
}

export default function Toast({ message, type = 'success', onClose, duration = 3500 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  // Fade in al montar
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-cierre con fade out
  useEffect(() => {
    if (duration === 0) return;
    const fadeTimer = setTimeout(() => setVisible(false), duration);
    const closeTimer = setTimeout(onClose, duration + 300); // espera al fade-out
    return () => { clearTimeout(fadeTimer); clearTimeout(closeTimer); };
  }, [duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const styles = {
    success: {
      bg: 'bg-emerald-600',
      icon: (
        <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 8 6 13 15 4" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-rose-600',
      icon: (
        <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-zinc-800',
      icon: (
        <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="7" /><line x1="8" y1="5" x2="8" y2="5.5" /><line x1="8" y1="8" x2="8" y2="11" />
        </svg>
      ),
    },
  };

  const s = styles[type];

  return (
    <div
      className="fixed top-5 left-1/2 z-[200] pointer-events-none"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div
        className={`
          ${s.bg} text-white text-sm font-medium
          flex items-center gap-2.5
          px-4 py-3 rounded-2xl shadow-lg
          pointer-events-auto
          transition-all duration-300 ease-out
          whitespace-nowrap max-w-[90vw]
        `}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
        }}
      >
        <span className="shrink-0">{s.icon}</span>
        <span className="leading-snug">{message}</span>
        <button
          onClick={handleClose}
          className="ml-1 shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="2" y1="2" x2="11" y2="11" /><line x1="11" y1="2" x2="2" y2="11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
