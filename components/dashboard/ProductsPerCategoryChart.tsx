
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
  Cell // <-- implementar futuro
} from 'recharts';
import type { ProductsPerCategoryData } from '@/lib/data'; 

interface ProductsPerCategoryChartProps {
  data: ProductsPerCategoryData[];
}


const COLORS = ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E3A8A']; 

const ProductsPerCategoryChart: React.FC<ProductsPerCategoryChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-foreground-muted py-8">No hay datos para mostrar en el gráfico.</div>;
  }

  return (
    
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 20, 
          left: -10, 
          bottom: 5,
        }}
        barGap={10} 
        barCategoryGap="20%" 
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis 
            dataKey="name" 
            tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12 }} 
            stroke="var(--color-border)"
        />
        <YAxis 
            allowDecimals={false} 
            tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12 }} 
            stroke="var(--color-border)"
        />
        <Tooltip
          cursor={{ fill: 'rgba(var(--color-primary-rgb), 0.1)' }} 
          contentStyle={{ 
            backgroundColor: 'var(--color-background)', 
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--rounded-md)',
          }}
          labelStyle={{ color: 'var(--color-foreground)', fontWeight: 'bold' }}
        />
        <Legend wrapperStyle={{ fontSize: 14, paddingTop: '10px' }} />
        <Bar dataKey="productCount" name="Nº de Productos" fill="var(--color-primary)" radius={[4, 4, 0, 0]}>
          {/* Opcional: Para colores diferentes por barra
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
          */}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ProductsPerCategoryChart;