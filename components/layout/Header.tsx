// components/layout/Header.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void; // Función para abrir/cerrar la sidebar
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    // Usamos clases de Tailwind para que este header solo sea visible en pantallas pequeñas (md:hidden)
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-muted/80 px-4 backdrop-blur-md md:hidden">
      <Link href="/dashboard" className="text-xl font-semibold text-primary">
        Ignite CRM
      </Link>
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-6 w-6" />
        <span className="sr-only">Abrir menú</span>
      </Button>
    </header>
  );
};

export default Header;