// app/(main)/analiticas/page.tsx
import StatCard from '@/components/dashboard/StatCard';
import NetProfitChart from '@/components/dashboard/NetProfitChart';
import WeeklySalesCountChart from '@/components/analiticas/WeeklySalesCountChart';
import { 
  getMonthlyFinancialSummaries,
  getDailySalesCountForCurrentWeek,
  getProductCount,
  getClientCount,
  getLowStockProductCount
} from '@/lib/data';
import { 
  Package, 
  Users, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp as GrossProfitIcon, 
  ShieldCheck, 
  TrendingDown as ExpensesIcon,
  BarChart3,
  CalendarDays
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return '$0,00';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export default async function AnaliticasPage() {
  // Obtenemos todos los datos necesarios en paralelo
  const [
    monthlySummaries,
    weeklySalesData,
    productCount, 
    clientCount, 
    lowStockCount,
  ] = await Promise.all([
    getMonthlyFinancialSummaries(6),
    getDailySalesCountForCurrentWeek(),
    getProductCount(),
    getClientCount(),
    getLowStockProductCount(),
  ]);
  
  const currentMonthData = monthlySummaries[monthlySummaries.length - 1] || {
    totalRevenue: 0, grossProfit: 0, totalExpenses: 0, netProfit: 0,
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Analíticas</h1>
        <p className="mt-1 text-foreground-muted">
          Una vista completa del rendimiento de tu negocio.
        </p>
      </div>

      {/* --- NIVEL 1: Fila Principal de Tarjetas Financieras --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard 
          title="Ingresos (Mes Actual)" 
          value={formatCurrency(currentMonthData.totalRevenue)}
          icon={<DollarSign size={20} />}
        />
        <StatCard 
          title="Ganancia Bruta (Mes)" 
          value={formatCurrency(currentMonthData.grossProfit)} 
          icon={<GrossProfitIcon size={20} />}
        />
        <StatCard 
          title="Gastos (Mes Actual)" 
          value={formatCurrency(currentMonthData.totalExpenses)} 
          icon={<ExpensesIcon size={20} />}
        />
        <StatCard 
          title="Ganancia Neta (Mes)" 
          value={formatCurrency(currentMonthData.netProfit)} 
          icon={<ShieldCheck size={20} />}
          className={currentMonthData.netProfit >= 0 ? "text-success" : "text-destructive"}
        />
      </div>

      {/* --- NIVEL 2: Fila de Estadísticas Operativas (Mini Tarjetas) --- */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-muted p-4 rounded-lg shadow-sm flex items-center">
            <Package size={24} className="text-primary mr-4" />
            <div>
                <div className="text-2xl font-bold text-foreground">{productCount}</div>
                <div className="text-xs text-foreground-muted">Productos Totales</div>
            </div>
        </div>
        <div className="bg-muted p-4 rounded-lg shadow-sm flex items-center">
            <Users size={24} className="text-primary mr-4" />
            <div>
                <div className="text-2xl font-bold text-foreground">{clientCount}</div>
                <div className="text-xs text-foreground-muted">Clientes Totales</div>
            </div>
        </div>
        <div className={`p-4 rounded-lg shadow-sm flex items-center ${lowStockCount > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
            <AlertTriangle size={24} className={`${lowStockCount > 0 ? 'text-destructive' : 'text-primary'} mr-4`}/>
            <div>
                <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{lowStockCount}</div>
                <div className="text-xs text-foreground-muted">Productos en Alerta</div>
            </div>
        </div>
      </div>

      {/* --- NIVEL 3: Grilla de Gráficos (50% y 50%) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Rentabilidad Mensual */}
        <div className="bg-muted p-4 sm:p-6 rounded-xl shadow">
          <div className="flex items-center mb-4">
            <BarChart3 size={20} className="text-primary mr-2" />
            <h2 className="text-xl font-semibold text-foreground">Rentabilidad (Últimos 6 Meses)</h2>
          </div>
          <NetProfitChart data={monthlySummaries} />
        </div>

        {/* Gráfico de Volumen de Ventas Semanal */}
        <div className="bg-muted p-4 sm:p-6 rounded-xl shadow">
          <div className="flex items-center mb-4">
            <CalendarDays size={20} className="text-primary mr-2" />
            <h2 className="text-xl font-semibold text-foreground">Ventas de la Semana</h2>
          </div>
          <WeeklySalesCountChart data={weeklySalesData} />
        </div>

      </div>
    </>
  );
}