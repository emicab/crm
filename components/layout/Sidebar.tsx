import React, { useState, useEffect } from "react";
import Link from "next/link";
import pkg from "../../package.json";
import { useModules } from "@/hooks/useModules";
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
  Barcode,
  ShoppingBag,
  Percent,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  moduleId?: string;
  allowedRoles?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Ventas y Caja",
    items: [
      { href: "/caja", label: "Caja", icon: <Wallet size={20} /> },
      { href: "/ventas/nueva", label: "Nueva Venta", icon: <PlusSquare size={20} /> },
      { href: "/ventas", label: "Historial Ventas", icon: <FileText size={20} /> },
    ],
  },
  {
    title: "Productos y Stock",
    items: [
      { href: "/productos", label: "Productos", icon: <Package size={20} />, allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/stock", label: "Carga de Stock", icon: <Barcode size={20} />, allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/stock/alertas", label: "Alertas de Stock", icon: <AlertTriangle size={20} />, allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/combos", label: "Combos", icon: <ShoppingBag size={20} />, moduleId: "combos_promociones", allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/promociones", label: "Promociones", icon: <Percent size={20} />, moduleId: "combos_promociones", allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/categorias", label: "Categorías", icon: <Tag size={20} />, allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/marcas", label: "Marcas", icon: <Tag size={20} />, allowedRoles: ["ADMIN", "SUPERVISOR"] },
    ],
  },
  {
    title: "Compras y Gastos",
    items: [
      { href: "/compras/nueva", label: "Nueva Compra", icon: <ArrowUpRightSquare size={20} />, moduleId: "compras", allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/compras", label: "Historial Compras", icon: <History size={20} />, moduleId: "compras", allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/gastos", label: "Gastos", icon: <TrendingDown size={20} />, moduleId: "gastos", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    ],
  },
  {
    title: "Contactos",
    items: [
      { href: "/clientes", label: "Clientes", icon: <Users size={20} />, moduleId: "clientes", allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/cuenta-corriente", label: "Cuenta Corriente", icon: <Users size={20} />, moduleId: "cuenta_corriente", allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/proveedores", label: "Proveedores", icon: <Truck size={20} />, moduleId: "compras", allowedRoles: ["ADMIN", "SUPERVISOR"] },
      { href: "/vendedores", label: "Vendedores", icon: <UserPlus size={20} />, moduleId: "vendedores", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    ],
  },
  {
    title: "General",
    items: [
      { href: "/analiticas", label: "Analíticas", icon: <LayoutDashboard size={20} />, moduleId: "analiticas", allowedRoles: ["ADMIN"] },
      { href: "/configuracion", label: "Configuración", icon: <Settings size={20} />, allowedRoles: ["ADMIN"] },
    ],
  },
];

const STORAGE_KEY = "sidebar-collapsed-groups";

function loadCollapsed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveCollapsed(groups: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...groups]));
}

import ProUpgradeModal from "@/components/ui/ProUpgradeModal";

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isModuleEnabled, currentUser, logout, supabaseLastSync, hasSupabaseConfig, storageMode, plan } = useModules();
  const [alertCount, setAlertCount] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(loadCollapsed);
  const [lockedFeatureModal, setLockedFeatureModal] = useState<string | null>(null);

  useEffect(() => {
    saveCollapsed(collapsedGroups);
  }, [collapsedGroups]);

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const res = await fetch('/api/products/alert-count');
        if (res.ok) {
          const data = await res.json();
          setAlertCount(data.count);
        }
      } catch {
        // Silently fail
      }
    };
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

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

  // Process nav groups with Pro lock indicators
  const filteredGroups = navGroups.map((group) => {
    const processedItems = group.items.map((item) => {
      const isEnabled = !item.moduleId || isModuleEnabled(item.moduleId);
      const isProFeature = ['cuenta_corriente', 'analiticas'].includes(item.moduleId || '');
      
      // If feature belongs to Pro plan and we are in basic plan, keep item visible with lock
      if (!isEnabled && isProFeature && plan === 'basico') {
        return {
          ...item,
          href: '/configuracion',
          isLocked: true,
        };
      }
      
      if (!isEnabled) return null;

      // Filter role permissions
      if (isModuleEnabled("roles") && currentUser && item.allowedRoles) {
        if (!item.allowedRoles.includes(currentUser.role)) return null;
      }

      return { ...item, isLocked: false };
    }).filter((item): item is (NavItem & { isLocked: boolean }) => item !== null);

    return { ...group, items: processedItems };
  }).filter((group) => group.items.length > 0);

  return (
    <>
      <div className={overlayClasses} onClick={onClose} />

      <aside id="sidebar" className={sidebarClasses}>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/" className="text-xl font-semibold text-primary">
            ClinPOS
          </Link>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-border md:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-grow overflow-y-auto p-4 space-y-3">
          {filteredGroups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.title);
            return (
              <div key={group.title}>
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground-muted/70 hover:text-foreground transition-colors rounded-md"
                >
                  {group.title}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    isCollapsed ? "max-h-0 opacity-0" : "max-h-96 opacity-100"
                  }`}
                >
                  <div className="space-y-0.5 pt-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.isLocked ? "#" : item.href}
                        onClick={(e) => {
                          if (item.isLocked) {
                            e.preventDefault();
                            setLockedFeatureModal(item.label);
                          } else {
                            onClose();
                          }
                        }}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors duration-150 ease-in-out font-medium text-sm ${
                          item.isLocked
                            ? 'opacity-75 hover:bg-amber-50 text-amber-800 cursor-pointer'
                            : 'hover:bg-primary-light hover:text-primary'
                        }`}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {item.isLocked && (
                          <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded shadow-xs">
                            PRO 🔒
                          </span>
                        )}
                        {item.label === "Alertas de Stock" && alertCount > 0 && (
                          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {alertCount > 99 ? '99+' : alertCount}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {isModuleEnabled("roles") && currentUser && (
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-xs">
            <div className="min-w-0">
              <p className="font-bold text-foreground truncate">{currentUser.name}</p>
              <p className="text-[9px] uppercase font-bold text-foreground-muted/75 tracking-wider mt-0.5">
                {currentUser.role === "ADMIN" ? "Administrador" : currentUser.role === "SUPERVISOR" ? "Supervisor" : "Cajero"}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-2 py-1 text-[10px] font-semibold bg-destructive/15 text-destructive rounded hover:bg-destructive/25 transition-colors cursor-pointer"
            >
              Bloquear
            </button>
          </div>
        )}

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
          {storageMode === "safe" && (
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-foreground-muted/70 font-semibold mb-1">
              <span className={`h-1.5 w-1.5 rounded-full ${
                !hasSupabaseConfig ? "bg-amber-400 animate-pulse" :
                !supabaseLastSync ? "bg-amber-400 animate-pulse" :
                (Date.now() - new Date(supabaseLastSync).getTime() < 24 * 60 * 60 * 1000) ? "bg-emerald-500" : "bg-amber-400"
              }`} />
              <span className="truncate max-w-[160px]" title={
                !hasSupabaseConfig ? "Nube sin configurar" :
                !supabaseLastSync ? "Sincronización pendiente" :
                `Último backup: ${new Date(supabaseLastSync).toLocaleString("es-AR")}`
              }>
                {!hasSupabaseConfig ? "Nube sin configurar" :
                 !supabaseLastSync ? "Sincronización pendiente" :
                 `Nube: ${new Date(supabaseLastSync).toLocaleDateString("es-AR")} ${new Date(supabaseLastSync).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            </div>
          )}
        </div>
      </aside>

      <ProUpgradeModal
        isOpen={!!lockedFeatureModal}
        onClose={() => setLockedFeatureModal(null)}
        featureName={lockedFeatureModal || undefined}
      />
    </>
  );
};

export default Sidebar;
