import Link from "next/link";
import {
  Home,
  Package,
  Tag,
  ShoppingCart,
  Users,
  Settings,
  UserPlus,
  FileText,
  TrendingDown,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Inicio", icon: <Home size={20} /> },
  {
    href: "/ventas/nueva",
    label: "Nueva Venta",
    icon: <ShoppingCart size={20} />,
  },
  { href: "/ventas", label: "Historial Ventas", icon: <FileText size={20} /> },
  { href: "/gastos", label: "Gastos", icon: <TrendingDown size={20} /> },
  { href: "/productos", label: "Productos", icon: <Package size={20} /> },
  { href: "/categorias", label: "Categorías", icon: <Tag size={20} /> },
  { href: "/marcas", label: "Marcas", icon: <Tag size={20} /> },
  { href: "/clientes", label: "Clientes", icon: <Users size={20} /> },
  { href: "/vendedores", label: "Vendedores", icon: <UserPlus size={20} /> },
  /* {
    href: "/configuracion",
    label: "Configuración",
    icon: <Settings size={20} />,
  }, */
];

const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-muted text-foreground-muted flex flex-col border-r border-border">
      {/* Logo o Nombre de la App */}
      <div className="h-16 flex items-center justify-center border-b border-border">
        <Link href="/" className="text-xl font-semibold text-primary">
          Sistema de Ventas
        </Link>
      </div>

      <nav className="flex-grow p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center space-x-3 px-3 py-2.5 rounded-md
                       hover:bg-primary-light hover:text-primary
                       transition-colors duration-150 ease-in-out
                       font-medium"
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-center">
          &copy; {new Date().getFullYear()} Creado por Emi Cabanillas.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
