// app/page.tsx
import StatCard from '@/components/dashboard/StatCard';
import SalesOverTimeChart from '@/components/dashboard/SalesOverTimeChart';
import TopSellingProductsChart from '@/components/dashboard/TopSellingProductsChart'; // Nuevo gráfico
import { 
  getProductCount, 
  getClientCount, 
  getBrandCount, 
  getCategoryCount, 
  getLowStockProductCount,
  getRevenueDataForCurrentAndPreviousMonth, // Función actualizada/nueva
  getSalesForLastXDays,
  getTopSellingProducts // Nueva función para el gráfico
} from '@/lib/data'; // Asegúrate que la ruta a lib/data.ts sea correcta
import { 
  Package, 
  Users, 
  Tag, 
  Shapes, 
  AlertTriangle, 
  DollarSign, 
  LineChart as LineChartIcon, // Icono para el gráfico de ventas
  Star // Icono para el gráfico de top productos
} from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'; // Iconos para tendencias

// Helper para formatear moneda (puedes moverlo a un archivo utils si lo usas en más sitios)
const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return 'N/A'; // Manejar NaN si es posible
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export default async function DashboardPage() {
  // Obtenemos todos los datos necesarios en paralelo
  const [
    productCount, 
    clientCount, 
    brandCount, 
    categoryCount,
    lowStockCount,
    revenueData,   // Datos para la tarjeta de ingresos con comparativa
    salesLast7Days,
    topSellingProducts 
  ] = await Promise.all([
    getProductCount(),
    getClientCount(),
    getBrandCount(),
    getCategoryCount(),
    getLowStockProductCount(),
    getRevenueDataForCurrentAndPreviousMonth(),
    getSalesForLastXDays(7), // Ventas de los últimos 7 días
    getTopSellingProducts(5, 30) // Top 5 productos de los últimos 30 días
  ]);

  // Lógica para la descripción de la StatCard de Ingresos
  let revenueDescriptionText = `vs ${formatCurrency(revenueData.previousMonthRevenue)} mes anterior`;
  let RevenueTrendIcon = Minus;
  let trendColor = "text-foreground-muted";

  if (revenueData.percentageChange !== null) {
    if (revenueData.percentageChange > 0) {
      RevenueTrendIcon = TrendingUp;
      trendColor = "text-success"; // Verde para positivo
      revenueDescriptionText = `+${revenueData.percentageChange.toFixed(1)}% (${formatCurrency(revenueData.differenceAmount)})`;
    } else if (revenueData.percentageChange < 0) {
      RevenueTrendIcon = TrendingDown;
      trendColor = "text-destructive"; // Rojo para negativo
      revenueDescriptionText = `${revenueData.percentageChange.toFixed(1)}% (${formatCurrency(revenueData.differenceAmount)})`;
    } else { // percentageChange es 0
        revenueDescriptionText = `Igual (${formatCurrency(revenueData.differenceAmount)})`;
    }
  } else if (revenueData.currentMonthRevenue > 0 && revenueData.previousMonthRevenue === 0) {
      RevenueTrendIcon = TrendingUp;
      trendColor = "text-success";
      revenueDescriptionText = `+100.0% (Nuevo) vs mes anterior`;
  }


  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Dashboard Principal</h1>
        <p className="mt-1 text-foreground-muted">
          Un resumen de la actividad y estado de tu negocio.
        </p>
      </div>

      {/* Fila de Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard 
          title="Ingresos Este Mes" 
          value={formatCurrency(revenueData.currentMonthRevenue)}
          icon={<DollarSign size={20} />} // Reducido tamaño de icono para consistencia
          description={
            <span className={`flex items-center text-xs ${trendColor}`}>
              <RevenueTrendIcon size={14} className="mr-1" />
              {revenueDescriptionText}
            </span>
          }
        />
        <StatCard 
          title="Total Productos" 
          value={productCount} 
          icon={<Package size={20} />} 
        />
        <StatCard 
          title="Total Clientes" 
          value={clientCount} 
          icon={<Users size={20} />}
        />
        <StatCard 
          title="Total Marcas" 
          value={brandCount} 
          icon={<Tag size={20} />}
        />
        <StatCard 
          title="Total Categorías" 
          value={categoryCount} 
          icon={<Shapes size={20} />}
        />
        <StatCard 
          title="Productos Bajo Stock" 
          value={lowStockCount} 
          icon={<AlertTriangle size={20} />}
          className={lowStockCount > 0 ? "bg-destructive/10 !text-destructive border border-destructive" : ""}
        />
      </div>

      {/* Sección de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Ventas en los Últimos 7 Días */}
        <div className="lg:col-span-2 bg-muted p-4 sm:p-6 rounded-xl shadow">
          <div className="flex items-center mb-4">
            <LineChartIcon size={20} className="text-primary mr-2" />
            <h2 className="text-xl font-semibold text-foreground">Ventas Últimos 7 Días</h2>
          </div>
          <SalesOverTimeChart data={salesLast7Days} />
        </div>
        
        {/* Gráfico de Productos Más Vendidos */}
        <div className="bg-muted p-4 sm:p-6 rounded-xl shadow">
          <div className="flex items-center mb-4">
            <Star size={20} className="text-primary mr-2" />
            <h2 className="text-xl font-semibold text-foreground">Top 5 Productos (Últ. 30 días)</h2>
          </div>
          <TopSellingProductsChart data={topSellingProducts} />
        </div>
      </div>
    </>
  );
}