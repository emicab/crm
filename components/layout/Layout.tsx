// components/layout/Layout.tsx
"use client"; // <--- NECESARIO para usar hooks como useState

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header'; // Importamos el nuevo Header

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Estado para controlar la visibilidad de la sidebar en móvil
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    // La clase 'md:flex' aplica flexbox solo en pantallas medianas y grandes
    <div className="md:flex h-screen bg-background text-foreground">
      {/* Pasamos el estado y la función para cerrar a la Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex flex-1 flex-col">
        {/* Pasamos la función para abrir/cerrar al Header */}
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        
        {/* Área de contenido principal */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;