// app/page.tsx
import StatCard from '@/components/dashboard/StatCard';
import NetProfitChart from '@/components/dashboard/NetProfitChart';
import { 
  getProductCount, 
  getClientCount, 
  getMonthlyFinancialSummaries 
} from '@/lib/data';
import { 
  Package, Users, DollarSign, TrendingDown as ExpensesIcon, TrendingUp as GrossProfitIcon,
  BarChart3,
  ShieldCheck
} from 'lucide-react';

export const dynamic = 'force-dynamic'; 

const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return 'N/A';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export default async function DashboardPage() {
  const [
    monthlySummaries,
    productCount, 
    clientCount, 
  ] = await Promise.all([
    getMonthlyFinancialSummaries(6),
    getProductCount(),
    getClientCount(),
  ]);
  
  const currentMonthData = monthlySummaries[monthlySummaries.length - 1] || {
    totalRevenue: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Dashboard Principal</h1>
        <p className="mt-1 text-foreground-muted">
          Resumen de la salud y rendimiento de tu negocio.
        </p>
      </div>

      {/* --- Fila Principal de Tarjetas Financieras --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard 
          title="Ingresos (Mes Actual)" 
          value={formatCurrency(currentMonthData.totalRevenue)}
          icon={<DollarSign size={20} />}
          description="Total de ventas facturadas."
        />
        <StatCard 
          title="Ganancia Bruta (Mes)" 
          value={formatCurrency(currentMonthData.grossProfit)} 
          icon={<GrossProfitIcon size={20} />}
          description="Ingresos - Costo de Productos"
        />
        <StatCard 
          title="Gastos (Mes Actual)" 
          value={formatCurrency(currentMonthData.totalExpenses)} 
          icon={<ExpensesIcon size={20} />}
          description="Gastos operativos registrados"
        />
        <StatCard 
          title="Ganancia Neta (Mes)" 
          value={formatCurrency(currentMonthData.netProfit)} 
          icon={<ShieldCheck size={20} />}
          description="La ganancia final del negocio"
          className={currentMonthData.netProfit >= 0 ? "text-success" : "text-destructive"}
        />
      </div>

      {/* --- Layout Principal de Gráfico y Estadísticas Secundarias --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- Columna Principal (Gráfico de Rentabilidad) --- */}
        <div className="lg:col-span-2 bg-muted p-4 sm:p-6 rounded-xl shadow">
          <div className="flex items-center mb-4">
            <BarChart3 size={20} className="text-primary mr-2" />
            <h2 className="text-xl font-semibold text-foreground">Resumen de Rentabilidad (Últimos 6 Meses)</h2>
          </div>
          <NetProfitChart data={monthlySummaries} />
        </div>

        {/* --- Columna Secundaria (Estadísticas Operativas) --- */}
        <div className="bg-muted p-4 sm:p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold text-foreground mb-4">Estadísticas Operativas</h2>
          <ul className="space-y-4 text-sm">
            <li className="flex justify-between items-center">
              <span className="flex items-center text-foreground-muted"><Package size={16} className="mr-2" /> Total Productos</span>
              <span className="font-semibold text-foreground">{productCount}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="flex items-center text-foreground-muted"><Users size={16} className="mr-2" /> Total Clientes</span>
              <span className="font-semibold text-foreground">{clientCount}</span>
            </li>
            {/* Puedes añadir más aquí si quieres, como Total Ventas o Gastos */}
          </ul>
        </div>
      </div>
    </>
  );
}