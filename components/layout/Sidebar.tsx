// components/layout/Sidebar.tsx
"use client";

import React from "react";
import Link from "next/link";
import pkg from "../../package.json";
import {
  Package,
  Tag,
  Users,
  UserPlus,
  FileText,
  PlusSquare,
  TrendingDown,
  X,
  Truck,
  ArrowUpRightSquare,
  History,
  LayoutDashboard,
  Wallet,
  Settings,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  // Si tu página principal es la raíz, usa href: '/' para el Dashboard
  {
    href: "/analiticas",
    label: "Analíticas",
    icon: <LayoutDashboard size={20} />,
  },
  { href: "/ventas", label: "Historial Ventas", icon: <FileText size={20} /> },
  {
    href: "/ventas/nueva",
    label: "Nueva Venta",
    icon: <PlusSquare size={20} />,
  },
  { href: "/caja", label: "Caja", icon: <Wallet size={20} /> },
  { href: "/compras", label: "Historial Compras", icon: <History size={20} /> },
  {
    href: "/compras/nueva",
    label: "Nueva Compra",
    icon: <ArrowUpRightSquare size={20} />,
  },
  { href: "/gastos", label: "Gastos", icon: <TrendingDown size={20} /> },
  { href: "/proveedores", label: "Proveedores", icon: <Truck size={20} /> },
  { href: "/clientes", label: "Clientes", icon: <Users size={20} /> },
  { href: "/productos", label: "Productos", icon: <Package size={20} /> },
  { href: "/categorias", label: "Categorías", icon: <Tag size={20} /> },
  { href: "/marcas", label: "Marcas", icon: <Tag size={20} /> },
  { href: "/vendedores", label: "Vendedores", icon: <UserPlus size={20} /> },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: <Settings size={20} />,
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // Construimos las clases dinámicamente
  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 h-full w-64 bg-muted text-foreground-muted flex-col border-r border-border
    transform transition-transform duration-300 ease-in-out
    md:sticky md:translate-x-0 md:flex
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
  `;

  const overlayClasses = `
    fixed inset-0 z-40 bg-black/60 md:hidden
    transition-opacity duration-300 ease-in-out
    ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
  `;

  return (
    <>
      {/* Overlay para el fondo en móvil */}
      <div className={overlayClasses} onClick={onClose} />

      {/* La Sidebar */}
      <aside className={sidebarClasses}>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/" className="text-xl font-semibold text-primary">
            Ignite CRM
          </Link>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-border md:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-grow p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-primary-light hover:text-primary transition-colors duration-150 ease-in-out font-medium"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex space-x-2 justify-center">
            <button
              onClick={async () => {
                try {
                  if (typeof window !== "undefined" && window.electronAPI) {
                    const res = await window.electronAPI.backupDatabase();
                    if (res.success) {
                      alert(
                        `Copia de seguridad exportada con éxito en:\n${res.path}`,
                      );
                    } else if (!res.canceled) {
                      alert(
                        `Error al exportar copia de seguridad: ${res.error}`,
                      );
                    }
                  } else {
                    alert(
                      "La copia de seguridad solo está disponible en la versión de escritorio (Electron).",
                    );
                  }
                } catch (err: any) {
                  alert(`Error: ${err.message}`);
                }
              }}
              className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors cursor-pointer"
              title="Copia de seguridad"
            >
              Exportar BD
            </button>
            <button
              onClick={async () => {
                try {
                  if (typeof window !== "undefined" && window.electronAPI) {
                    const confirmRestore = confirm(
                      "¿Estás seguro de que deseas importar una base de datos? Esto sobrescribirá la base de datos actual.",
                    );
                    if (!confirmRestore) return;

                    const res = await window.electronAPI.restoreDatabase();
                    if (res.success) {
                      alert(`${res.message}`);
                      window.location.reload();
                    } else if (!res.canceled) {
                      alert(
                        `Error al importar copia de seguridad: ${res.error}`,
                      );
                    }
                  } else {
                    alert(
                      "La restauración solo está disponible en la versión de escritorio (Electron).",
                    );
                  }
                } catch (err: any) {
                  alert(`Error: ${err.message}`);
                }
              }}
              className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors cursor-pointer"
              title="Restaurar base de datos"
            >
              Importar BD
            </button>
          </div>
          <p className="text-xs text-center">
            &copy; {new Date().getFullYear()} Ignite CRM | v{pkg.version}
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
