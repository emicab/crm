import Link from 'next/link';
import {
  ArrowUpRightSquare,
  History,
  LayoutDashboard,
  Package,
  Shapes,
  Tag,
  ShoppingCart,
  TrendingDown,
  Truck,
  Users,
  UserPlus,
  Wallet,
  AlertTriangle,
  Barcode,
  ShoppingBag,
  Percent,
  FileText,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const priorityModules = [
  { name: 'Caja', href: '/caja', icon: Wallet, description: 'Abrir/Cerrar caja y ver movimientos del día.', shortcut: 'Ctrl+J' },
  { name: 'Nueva Venta', href: '/ventas/nueva', icon: ShoppingCart, description: 'Registra una nueva transacción de venta.', shortcut: 'Ctrl+N' },
  { name: 'Productos', href: '/productos', icon: Package, description: 'Gestiona tu catálogo de productos.', shortcut: 'Ctrl+P' },
  { name: 'Gastos', href: '/gastos', icon: TrendingDown, description: 'Registra y controla tus gastos.', shortcut: 'Ctrl+G' },
];

const secondaryModules = [
  { name: 'Nueva Compra', href: '/compras/nueva', icon: ArrowUpRightSquare, description: 'Ingresa mercadería y actualiza tu stock.' },
  { name: 'Analíticas', href: '/analiticas', icon: LayoutDashboard, description: 'Visualiza tus métricas y gráficos clave.' },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Proveedores', href: '/proveedores', icon: Truck },
  { name: 'Vendedores', href: '/vendedores', icon: UserPlus },
  { name: 'Categorías', href: '/categorias', icon: Shapes },
  { name: 'Marcas', href: '/marcas', icon: Tag },
  { name: 'Carga de Stock', href: '/stock', icon: Barcode },
  { name: 'Alertas de Stock', href: '/stock/alertas', icon: AlertTriangle },
  { name: 'Combos', href: '/combos', icon: ShoppingBag },
  { name: 'Promociones', href: '/promociones', icon: Percent },
  { name: 'Historial Ventas', href: '/ventas', icon: FileText },
  { name: 'Historial Compras', href: '/compras', icon: History },
];

const shortcuts = [
  { keys: ['Ctrl', 'N'], label: 'Nueva Venta' },
  { keys: ['Ctrl', 'J'], label: 'Caja' },
  { keys: ['Ctrl', 'P'], label: 'Productos' },
  { keys: ['Ctrl', 'G'], label: 'Gastos' },
  { keys: ['Ctrl', 'E'], label: 'Nueva Compra' },
  { keys: ['Ctrl', 'A'], label: 'Analíticas' },
  { keys: ['F9'], label: 'Ir a Caja' },
  { keys: ['Ctrl', ',', ''], label: 'Configuración' },
];

const NavCard = ({ module }: { module: typeof priorityModules[0] }) => (
  <Link href={module.href} className="group relative block rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-200 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1 overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-0" />
    <div className="flex items-center space-x-4 relative z-10">
      <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-3.5 text-primary shadow-sm">
        <module.icon className="h-7 w-7" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{module.name}</h3>
        <p className="mt-0.5 text-sm text-foreground-muted">{module.description}</p>
      </div>
      {module.shortcut && (
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-muted border border-border text-[11px] font-mono text-foreground-muted shrink-0">
          {module.shortcut.split('+').map((k, i) => (
            <span key={i}>
              {i > 0 && <span className="text-foreground-muted/40 mx-0.5">+</span>}
              <kbd className="px-1 py-0.5 rounded bg-background border border-border">{k}</kbd>
            </span>
          ))}
        </div>
      )}
    </div>
  </Link>
);

const SecondaryNavCard = ({ module }: { module: typeof secondaryModules[0] }) => (
  <Link href={module.href} className="group flex flex-col items-center justify-center rounded-xl border border-border bg-white p-4 text-center shadow-sm transition-all duration-200 ease-in-out hover:border-primary hover:shadow-md hover:-translate-y-0.5">
    <module.icon className="h-7 w-7 text-foreground-muted transition-colors group-hover:text-primary" />
    <p className="mt-2 text-xs font-semibold text-foreground">{module.name}</p>
  </Link>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-dream-100/30 to-background bg-fixed">
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
        <header className="text-center pt-10 pb-6 md:pt-16 md:pb-10">
          <h1 className="text-4xl font-bold tracking-tight text-foreground uppercase sm:text-5xl">
            Bienvenido a <strong className="text-primary">Ignite CRM</strong>
          </h1>
          <p className="mt-3 text-lg text-foreground-muted max-w-2xl mx-auto">
            Selecciona un módulo para empezar a gestionar tu negocio.
          </p>
        </header>

        <main className="space-y-10 pb-10">
          <section id="quick-access">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-foreground px-1">
                <span className="inline-block w-1.5 h-5 bg-primary rounded-full align-middle mr-2" />
                Acceso Rápido
              </h2>
              <span className="text-xs text-foreground-muted bg-muted px-3 py-1 rounded-full border border-border">
                Tus módulos más usados
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {priorityModules.map((mod) => (
                <NavCard key={mod.name} module={mod} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-foreground px-1">
                <span className="inline-block w-1.5 h-5 bg-primary rounded-full align-middle mr-2" />
                Atajos de Teclado
              </h2>
              <span className="text-xs text-foreground-muted bg-muted px-3 py-1 rounded-full border border-border">
                Presiona F1 para ayuda
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-6">
                {shortcuts.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {s.keys.filter(k => k).map((k, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-foreground-muted/40 mx-0.5 text-xs">+</span>}
                          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[11px] text-foreground-muted">{k}</kbd>
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-foreground-muted">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-5 px-1">
              <span className="inline-block w-1.5 h-5 bg-primary rounded-full align-middle mr-2" />
              Todos los Módulos
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {secondaryModules.map((mod) => (
                <SecondaryNavCard key={mod.name} module={mod} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
