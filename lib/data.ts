import prisma from './prisma'; 
import { Decimal } from '@prisma/client/runtime/library';

export async function getProductCount() {
  try {
    return await prisma.product.count();
  } catch (error) {
    console.error("Error fetching product count:", error);
    return 0; // Devolver 0 en caso de error
  }
}

export async function getClientCount() {
  try {
    return await prisma.client.count();
  } catch (error) {
    console.error("Error fetching client count:", error);
    return 0;
  }
}

export async function getBrandCount() {
  try {
    return await prisma.brand.count();
  } catch (error) {
    console.error("Error fetching brand count:", error);
    return 0;
  }
}

export async function getCategoryCount() {
  try {
    return await prisma.category.count();
  } catch (error) {
    console.error("Error fetching category count:", error);
    return 0;
  }
}

// Podríamos añadir más aquí, como "productos con stock bajo", etc.
export async function getLowStockProductCount(minStockThreshold = 5) {
  try {
    return await prisma.product.count({
      where: {
        AND: [
          { quantityStock: { lt: prisma.product.fields.stockMinAlert } }, // Stock por debajo de su alerta individual
          { stockMinAlert: { not: null } } // Y que tengan un stockMinAlert definido
        ]
        // O una forma más simple si todas las alertas son el mismo número:
        // quantityStock: { lt: minStockThreshold } 
      }
    });
  } catch (error) {
    console.error("Error fetching low stock product count:", error);
    return 0;
  }
}

export interface ProductsPerCategoryData {
    name: string; // Nombre de la categoría
    productCount: number; // Cantidad de productos en esa categoría

  }
  
  export async function getProductsPerCategory(): Promise<ProductsPerCategoryData[]> {
    try {
      const categoriesWithProductCount = await prisma.category.findMany({
        include: {
          _count: { // Prisma te permite contar relaciones así
            select: { products: true }, // Cuenta los productos relacionados a esta categoría
          },
        },
        orderBy: {
          // Opcional: ordenar por nombre de categoría o por cantidad de productos
          name: 'asc', 
        }
      });
  
      // Transformamos los datos al formato que necesitamos para el gráfico
      const chartData = categoriesWithProductCount.map(category => ({
        name: category.name,
        productCount: category._count.products,
      }));
      
      // Opcionalmente, podrías filtrar categorías sin productos si no quieres mostrarlas
      return chartData.filter(data => data.productCount > 0);
      //return chartData;
  
    } catch (error) {
      console.error("Error fetching products per category for chart:", error);
      return []; // Devuelve un array vacío en caso de error
    }
  }

  export async function getTotalRevenueThisMonth(): Promise<number> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Fin del último día del mes
  
      const sales = await prisma.sale.findMany({
        where: {
          saleDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: {
          totalAmount: true,
        },
      });
  
      const totalRevenue = sales.reduce((sum, sale) => sum.plus(sale.totalAmount), new Decimal(0));
      return totalRevenue.toNumber(); // Convertir Decimal a número para el frontend
    } catch (error) {
      console.error("Error fetching total revenue this month:", error);
      return 0;
    }
  }
  
  export interface DailySalesData {
    date: string; // Formato YYYY-MM-DD o el que prefieras para el gráfico
    totalSales: number;
  }
  
  export async function getSalesForLastXDays(days: number): Promise<DailySalesData[]> {
    try {
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - (days - 1)); // Incluir el día de hoy, X días en total
      startDate.setHours(0, 0, 0, 0); // Inicio del día
      
      today.setHours(23,59,59,999); // Fin del día de hoy
  
      const sales = await prisma.sale.findMany({
        where: {
          saleDate: {
            gte: startDate,
            lte: today, 
          },
        },
        orderBy: {
          saleDate: 'asc',
        },
        select: {
          saleDate: true,
          totalAmount: true,
        },
      });
  
      // Agrupar ventas por día y sumar totales
      const dailySalesMap = new Map<string, Decimal>();
  
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateString = d.toISOString().split('T')[0]; // YYYY-MM-DD
        dailySalesMap.set(dateString, new Decimal(0)); // Inicializar todos los días del rango
      }
  
      sales.forEach(sale => {
        const dateString = sale.saleDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentTotal = dailySalesMap.get(dateString) || new Decimal(0);
        dailySalesMap.set(dateString, currentTotal.plus(sale.totalAmount));
      });
      
      const chartData: DailySalesData[] = [];
      dailySalesMap.forEach((total, date) => {
        chartData.push({ date, totalSales: total.toNumber() });
      });
      
      // Asegurar que el orden sea cronológico si el Map no lo garantiza (aunque debería con inserción ordenada)
      chartData.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
      return chartData;
    } catch (error) {
      console.error(`Error fetching sales for last ${days} days:`, error);
      return [];
    }
  }

  export interface MonthlyRevenueComparison {
    currentMonthRevenue: number;
    previousMonthRevenue: number;
    differenceAmount: number;
    percentageChange: number | null; // null si el mes anterior fue 0
  }
  
  export async function getRevenueDataForCurrentAndPreviousMonth(): Promise<MonthlyRevenueComparison> {
    try {
      const now = new Date();
      
      // Mes Actual
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
      // Mes Anterior
      const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  
      const currentMonthSales = await prisma.sale.findMany({
        where: { saleDate: { gte: startOfCurrentMonth, lte: endOfCurrentMonth } },
        select: { totalAmount: true },
      });
      const currentMonthRevenueDecimal = currentMonthSales.reduce((sum, sale) => sum.plus(sale.totalAmount), new Decimal(0));
      const currentMonthRevenue = currentMonthRevenueDecimal.toNumber();
  
      const previousMonthSales = await prisma.sale.findMany({
        where: { saleDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } },
        select: { totalAmount: true },
      });
      const previousMonthRevenueDecimal = previousMonthSales.reduce((sum, sale) => sum.plus(sale.totalAmount), new Decimal(0));
      const previousMonthRevenue = previousMonthRevenueDecimal.toNumber();
  
      const differenceAmount = currentMonthRevenue - previousMonthRevenue;
      let percentageChange: number | null = null;
      if (previousMonthRevenue !== 0) {
        percentageChange = ((differenceAmount / previousMonthRevenue) * 100);
      } else if (currentMonthRevenue > 0) {
          percentageChange = 100; // Si antes era 0 y ahora hay ventas, es un "infinito" o 100% de aumento desde 0
      }
  
  
      return {
        currentMonthRevenue,
        previousMonthRevenue,
        differenceAmount,
        percentageChange,
      };
  
    } catch (error) {
      console.error("Error fetching monthly revenue comparison:", error);
      return { // Devolver valores por defecto en caso de error
        currentMonthRevenue: 0,
        previousMonthRevenue: 0,
        differenceAmount: 0,
        percentageChange: null,
      };
    }
  }

  export interface TopSellingProductData {
    productName: string;
    totalSold: number;
  }
  
  export async function getTopSellingProducts(limit: number = 5, daysAgo: number = 30): Promise<TopSellingProductData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      startDate.setHours(0,0,0,0);
  
      const endDate = new Date();
      endDate.setHours(23,59,59,999);
  
      const topProducts = await prisma.saleItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true,
        },
        where: {
          sale: {
            saleDate: {
              gte: startDate,
              lte: endDate,
            }
          }
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limit,
      });
  
      if (topProducts.length === 0) return [];
  
      // Obtener los nombres de los productos
      const productIds = topProducts.map(p => p.productId);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: {
          id: true,
          name: true,
        },
      });
  
      const productMap = new Map(products.map(p => [p.id, p.name]));
  
      return topProducts.map(p => ({
        productName: productMap.get(p.productId) || 'Producto Desconocido',
        totalSold: p._sum.quantity || 0,
      }));
  
    } catch (error) {
      console.error("Error fetching top selling products:", error);
      return [];
    }
  }