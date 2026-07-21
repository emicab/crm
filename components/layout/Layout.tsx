// components/layout/Layout.tsx
"use client";

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import KbdFooter from './KbdFooter';
import { useModules } from '@/hooks/useModules';
import { usePathname } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const ROUTE_PERMISSIONS = [
  { pathPrefix: "/configuracion", allowedRoles: ["ADMIN"] },
  { pathPrefix: "/analiticas", allowedRoles: ["ADMIN"] },
  { pathPrefix: "/productos", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/stock", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/combos", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/promociones", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/categorias", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/marcas", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/compras", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/gastos", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/clientes", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/cuenta-corriente", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/proveedores", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { pathPrefix: "/vendedores", allowedRoles: ["ADMIN", "SUPERVISOR"] },
];

const AccessDeniedView = () => (
  <div className="flex flex-col items-center justify-center p-12 py-24 text-center space-y-4">
    <div className="bg-destructive/10 text-destructive p-4 rounded-full shadow-inner animate-pulse">
      <ShieldAlert size={36} />
    </div>
    <h2 className="text-2xl font-bold text-foreground uppercase tracking-tight">Acceso Restringido</h2>
    <p className="text-sm text-foreground-muted max-w-sm leading-relaxed">
      Tu cuenta no tiene los permisos necesarios para acceder a esta sección. Comunicante con el administrador del sistema.
    </p>
  </div>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { businessProfile, isLoading, isModuleEnabled, currentUser, hasSupabaseConfig, storageMode, hasRolePermission } = useModules();
  const pathname = usePathname() || "";

  // Si la configuración cargó y no hay rubro configurado, mostramos onboarding bloqueante
  const showOnboarding = !isLoading && businessProfile === 'unset';

  // Si el módulo de roles está activo y no hay sesión iniciada, mostramos bloqueo de PIN
  const showPinLock = !isLoading && !showOnboarding && isModuleEnabled('roles') && !currentUser;

  // Sincronización automática de Supabase cada 5 minutos
  React.useEffect(() => {
    if (isLoading || !hasSupabaseConfig || showOnboarding || showPinLock || storageMode === 'local') {
      return;
    }

    const triggerSync = async () => {
      try {
        await fetch("/api/sync");
      } catch (err) {
        console.error("Error al sincronizar automáticamente con Supabase:", err);
      }
    };

    // Lanzar sync inicial 5 segundos después de montar
    const initialTimeout = setTimeout(triggerSync, 5000);

    // Programar intervalo cada 5 minutos
    const interval = setInterval(triggerSync, 300000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [isLoading, hasSupabaseConfig, showOnboarding, showPinLock]);

  // Validar si el rol actual puede acceder a la ruta activa
  let isAccessAllowed = true;
  if (!isLoading && !showOnboarding && !showPinLock && isModuleEnabled('roles') && currentUser) {
    isAccessAllowed = hasRolePermission(currentUser.role, pathname);
  }

  return (
    <div className="md:flex h-screen bg-background text-foreground">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {isAccessAllowed ? children : <AccessDeniedView />}
        </main>
        <KbdFooter />
      </div>
    </div>
  );
};

export default Layout;