// app/page.tsx (Nuevo Centro de Navegación con Tarjetas)
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
  UserPlus 
} from 'lucide-react';

export const dynamic = 'force-dynamic'; 

// Módulos para las tarjetas grandes
const mainModules = [
  { name: 'Nueva Venta', href: '/ventas/nueva', icon: ShoppingCart, description: 'Registra una nueva transacción de venta.' },
  { name: 'Nueva Compra', href: '/compras/nueva', icon: ArrowUpRightSquare, description: 'Ingresa mercadería y actualiza tu stock.' },
  { name: 'Dashboard Analítico', href: '/dashboard', icon: LayoutDashboard, description: 'Visualiza tus métricas y gráficos clave.' },
];

// Módulos para las tarjetas secundarias
const historyAndRegisters = [
    { name: 'Historial de Ventas', href: '/ventas', icon: History },
    { name: 'Historial de Compras', href: '/compras', icon: History },
    { name: 'Registro de Gastos', href: '/gastos', icon: TrendingDown },
];

const managementModules = [
  { name: 'Productos', href: '/productos', icon: Package },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Proveedores', href: '/proveedores', icon: Truck },
  { name: 'Vendedores', href: '/vendedores', icon: UserPlus },
  { name: 'Categorías', href: '/categorias', icon: Shapes },
  { name: 'Marcas', href: '/marcas', icon: Tag },
];

// --- Componentes de Tarjeta ---

// Tarjeta para los módulos principales (la que ya teníamos)
const NavCard = ({ module }: { module: typeof mainModules[0] }) => (
  <Link href={module.href} className="group block rounded-xl border border-border bg-muted p-6 shadow transition-all duration-200 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
    <div className="flex items-center space-x-4">
      <div className="rounded-lg bg-primary/10 p-3 text-primary">
        <module.icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground group-hover:text-primary">{module.name}</h3>
        {module.description && <p className="mt-1 text-sm text-foreground-muted">{module.description}</p>}
      </div>
    </div>
  </Link>
);

// *** NUEVO COMPONENTE para las tarjetas secundarias (más pequeñas y cuadradas) ***
const SecondaryNavCard = ({ module }: { module: typeof historyAndRegisters[0] }) => (
  <Link href={module.href} className="group flex flex-col items-center justify-center rounded-xl border border-border bg-background p-4 text-center shadow-sm transition-all duration-200 ease-in-out hover:border-primary hover:shadow-md hover:-translate-y-0.5">
    <module.icon className="h-8 w-8 text-foreground-muted transition-colors group-hover:text-primary" />
    <p className="mt-2 text-sm font-semibold text-foreground">{module.name}</p>
  </Link>
);


export default function HomePage() {
  return (
    // Fondo con un patrón de grilla sutil para darle un toque de diseño
    <div className="flex justify-center items-center min-h-screen bg-[#EEE] dark:bg-slate-50/50 bg-[url('/grid.svg')]">
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
        <header className="text-center mb-12">
          {/* Puedes poner tu logo aquí si quieres */}
          {/* <img src="/logo.png" alt="Ignite CRM Logo" className="mx-auto h-16 w-auto mb-4" /> */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Bienvenido a Ignite CRM</h1>
          <p className="mt-4 text-lg text-foreground-muted">Selecciona un módulo para empezar a gestionar tu negocio.</p>
        </header>

        <main className="space-y-12">
          {/* Módulos Principales */}
          <section>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {mainModules.map((mod) => (
                <NavCard key={mod.name} module={mod} />
              ))}
            </div>
          </section>

          {/* *** SECCIONES SECUNDARIAS ACTUALIZADAS CON GRILLA DE TARJETAS *** */}
          <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4 px-2">Historiales y Registros</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {historyAndRegisters.map((mod) => (
                    <SecondaryNavCard key={mod.name} module={mod} />
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4 px-2">Gestión General</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {managementModules.map((mod) => (
                    <SecondaryNavCard key={mod.name} module={mod} />
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}