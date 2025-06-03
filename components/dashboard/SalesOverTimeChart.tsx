"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DailySalesData } from '@/lib/data'; // Importamos el tipo

interface SalesOverTimeChartProps {
  data: DailySalesData[];
}

const SalesOverTimeChart: React.FC<SalesOverTimeChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-foreground-muted py-8">No hay datos de ventas para mostrar en el gráfico.</div>;
  }

  const formatXAxis = (tickItem: string) => {
    // Formatear YYYY-MM-DD a DD/MM
    const date = new Date(tickItem + "T00:00:00"); // Asegurar que se parsea como local
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };
  
  const formatCurrencyForTooltip = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };


  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 20,
          left: -10, // Ajustar si las etiquetas del YAxis ($) son largas
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis} 
            tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12 }}
            stroke="var(--color-border)"
        />
        <YAxis 
            tickFormatter={(value) => `$${value.toLocaleString('es-AR')}`}
            tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12 }}
            stroke="var(--color-border)"
            allowDecimals={false}
        />
        <Tooltip
            formatter={formatCurrencyForTooltip}
            contentStyle={{ 
                backgroundColor: 'var(--color-background)', 
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--rounded-md)',
            }}
            labelStyle={{ color: 'var(--color-foreground)', fontWeight: 'bold' }}
            labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
        />
        <Legend wrapperStyle={{ fontSize: 14, paddingTop: '10px' }}/>
        <Line 
            type="monotone" 
            dataKey="totalSales" 
            name="Ventas Diarias" 
            stroke="var(--color-primary)" 
            strokeWidth={2} 
            activeDot={{ r: 6 }} 
            dot={{ r: 3, fill: 'var(--color-primary)'}}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SalesOverTimeChart;