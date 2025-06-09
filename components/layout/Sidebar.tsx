// components/layout/Sidebar.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react'; // Para las animaciones
import { Home, Package, Tag, Users, UserPlus, FileText, PlusSquare, TrendingDown, X } from 'lucide-react';

// Definimos las props que recibirá el componente
interface SidebarProps {
  isOpen: boolean; // Estado para saber si está abierta en móvil
  onClose: () => void; // Función para cerrarla
}

const navItems = [
  // Tu lista de navItems como estaba...
  { href: '/', label: 'Dashboard', icon: <Home size={20} /> },
  { href: '/productos', label: 'Productos', icon: <Package size={20} /> },
  { href: '/categorias', label: 'Categorías', icon: <Tag size={20} /> },
  { href: '/marcas', label: 'Marcas', icon: <Tag size={20} /> },
  { href: '/clientes', label: 'Clientes', icon: <Users size={20} /> },
  { href: '/vendedores', label: 'Vendedores', icon: <UserPlus size={20} /> },
  { href: '/ventas', label: 'Historial Ventas', icon: <FileText size={20} /> },
  { href: '/ventas/nueva', label: 'Nueva Venta', icon: <PlusSquare size={20} /> },
  { href: '/gastos', label: 'Gastos', icon: <TrendingDown size={20} /> },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {/* Overlay para el fondo en móvil */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* La Sidebar */}
      <motion.aside
        // Clases base y condicionales para la posición
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-muted text-foreground-muted flex-col border-r border-border 
                    md:sticky md:flex md:translate-x-0`}
        // Animaciones con Framer Motion
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? '0%' : '-100%' }}
        exit={{ x: '-100%' }}
        transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
        // Clases específicas para móvil (que se aplican con la animación)
        // Esto asegura que la sidebar se muestre como un 'drawer' en móvil
      >
        {/* Encabezado de la Sidebar con el logo y el botón de cerrar (visible en móvil) */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" className="text-xl font-semibold text-primary">
            Ignite CRM
          </Link>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-border md:hidden" aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        {/* Navegación (la misma que tenías) */}
        <nav className="flex-grow p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose} // Cerrar la sidebar al hacer clic en un enlace en móvil
              className="flex items-center space-x-3 px-3 py-2.5 rounded-md hover:bg-primary-light hover:text-primary transition-colors duration-150 ease-in-out font-medium"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer (como estaba) */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-center">&copy; {new Date().getFullYear()} Ignite CRM</p>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

export default Sidebar;