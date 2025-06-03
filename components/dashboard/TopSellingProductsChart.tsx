// components/dashboard/TopSellingProductsChart.tsx
"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TopSellingProductData } from '@/lib/data';

interface TopSellingProductsChartProps {
  data: TopSellingProductData[];
}

const TopSellingProductsChart: React.FC<TopSellingProductsChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-foreground-muted py-8">No hay datos de productos más vendidos.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart 
        layout="vertical" // Para barras horizontales
        data={data}
        margin={{ top: 5, right: 20, left: 30, bottom: 5 }} // Ajustar margen izquierdo para etiquetas Y
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis 
            type="number" 
            allowDecimals={false} 
            tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12 }}
            stroke="var(--color-border)"
        />
        <YAxis 
            type="category" 
            dataKey="productName" 
            width={120} // Ancho para nombres de producto
            tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12, width:110 }}
            stroke="var(--color-border)"
            interval={0} // Mostrar todas las etiquetas
        />
        <Tooltip
            contentStyle={{ 
                backgroundColor: 'var(--color-background)', 
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--rounded-md)',
            }}
            labelStyle={{ color: 'var(--color-foreground)', fontWeight: 'bold' }}
            formatter={(value: number) => [`${value} unidades`, "Total Vendido"]}
        />
        <Legend wrapperStyle={{ fontSize: 14, paddingTop: '10px' }} />
        <Bar dataKey="totalSold" name="Unidades Vendidas" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopSellingProductsChart;