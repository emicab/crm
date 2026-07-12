"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle } from 'lucide-react';

interface Shortcut {
  keys: string[];
  label: string;
  action: () => void;
}

const KbdFooter = () => {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  const shortcuts: Shortcut[] = [
    { keys: ['F1'], label: 'Ayuda', action: () => setVisible(v => !v) },
    { keys: ['F2'], label: 'Tipo de pago', action: () => focusSelect('paymentType') },
    { keys: ['F5'], label: 'Recargar', action: () => window.location.reload() },
    { keys: ['F8'], label: 'Buscar producto', action: () => focusInput('producto') },
    { keys: ['F9'], label: 'Caja', action: () => router.push('/caja') },
    { keys: ['F10'], label: 'Finalizar venta', action: () => clickButton('submit') },
    { keys: ['F11'], label: 'Pantalla completa', action: () => document.documentElement.requestFullscreen?.() },
    { keys: ['Esc'], label: 'Cancelar', action: () => {} },
    { keys: ['Ctrl', 'N'], label: 'Nueva Venta', action: () => router.push('/ventas/nueva') },
    { keys: ['Ctrl', 'E'], label: 'Nueva Compra', action: () => router.push('/compras/nueva') },
    { keys: ['Ctrl', 'P'], label: 'Productos', action: () => router.push('/productos') },
    { keys: ['Ctrl', 'Shift', 'P'], label: 'Nuevo Producto', action: () => router.push('/productos/nuevo') },
    { keys: ['Ctrl', 'Shift', 'L'], label: 'Clientes', action: () => router.push('/clientes') },
    { keys: ['Ctrl', 'Shift', 'R'], label: 'Proveedores', action: () => router.push('/proveedores') },
    { keys: ['Ctrl', 'J'], label: 'Caja', action: () => router.push('/caja') },
    { keys: ['Ctrl', 'G'], label: 'Gastos', action: () => router.push('/gastos') },
    { keys: ['Ctrl', 'Alt', 'G'], label: 'Nuevo Gasto', action: () => router.push('/gastos/nuevo') },
    { keys: ['Ctrl', 'A'], label: 'Analíticas', action: () => router.push('/analiticas') },
    { keys: ['Ctrl', 'Shift', 'V'], label: 'Hist. Ventas', action: () => router.push('/ventas') },
    { keys: ['Ctrl', 'Shift', 'C'], label: 'Hist. Compras', action: () => router.push('/compras') },
    { keys: ['Ctrl', ','], label: 'Configuración', action: () => router.push('/configuracion') },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      if (e.key === 'F1') { e.preventDefault(); setVisible(v => !v); return; }
      if (e.key === 'F5') { e.preventDefault(); window.location.reload(); return; }
      if (e.key === 'F9') { e.preventDefault(); router.push('/caja'); return; }
      if (e.key === 'F11') { e.preventDefault(); document.documentElement.requestFullscreen?.(); return; }
      if (e.key === 'F12') return;

      if (ctrl && key === ',') { e.preventDefault(); router.push('/configuracion'); return; }
      if (ctrl && !shift && !alt) {
        const map: Record<string, string> = {
          n: '/ventas/nueva', e: '/compras/nueva', p: '/productos',
          j: '/caja',
          g: '/gastos', a: '/analiticas',
        };
        if (map[key]) { e.preventDefault(); router.push(map[key]); return; }
      }
      if (ctrl && shift && !alt) {
        if (key === 'p') { e.preventDefault(); router.push('/productos/nuevo'); return; }
        if (key === 'v') { e.preventDefault(); router.push('/ventas'); return; }
        if (key === 'c') { e.preventDefault(); router.push('/compras'); return; }
        if (key === 'l') { e.preventDefault(); router.push('/clientes'); return; }
        if (key === 'r') { e.preventDefault(); router.push('/proveedores'); return; }
      }
      if (ctrl && !shift && alt && key === 'g') {
        e.preventDefault(); router.push('/gastos/nuevo'); return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  if (!visible) return null;

  const shortcutGroups = [
    shortcuts.slice(0, 7),  // F-keys + Esc
    shortcuts.slice(7, 15), // Ctrl combinations
    shortcuts.slice(15),     // rest
  ];

  return (
    <footer className="sticky bottom-0 z-40 w-full bg-muted/95 backdrop-blur border-t border-border text-xs text-foreground-muted overflow-x-auto">
      <div className="flex items-center gap-1 px-3 py-1.5 min-w-max">
        <HelpCircle size={12} className="shrink-0" />
        {shortcutGroups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <span className="text-border mx-1 select-none">|</span>}
            {group.map((s) => (
              <button
                key={s.label}
                title={s.label}
                onClick={s.action}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
              >
                {s.keys.map((k, ki) => (
                  <React.Fragment key={ki}>
                    {ki > 0 && <span className="text-foreground-muted/60">+</span>}
                    <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[10px] leading-none">
                      {k}
                    </kbd>
                  </React.Fragment>
                ))}
                <span className="ml-0.5">{s.label}</span>
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
    </footer>
  );
};

function focusInput(name: string) {
  const input = document.querySelector<HTMLInputElement>(`input[placeholder*="${name}"]`);
  input?.focus();
}

function focusSelect(name: string) {
  const sel = document.querySelector<HTMLSelectElement>(`select[name="${name}"]`);
  sel?.focus();
}

function clickButton(name: string) {
  const btn = document.querySelector<HTMLButtonElement>(`button[type="${name}"]`);
  btn?.click();
}

export default KbdFooter;
