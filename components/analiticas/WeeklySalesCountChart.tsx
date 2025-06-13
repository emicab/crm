// components/analiticas/WeeklySalesCountChart.tsx
"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DailySalesCount } from '@/lib/data';

interface WeeklySalesCountChartProps {
  data: DailySalesCount[];
}

const WeeklySalesCountChart: React.FC<WeeklySalesCountChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-foreground-muted">No hay datos de ventas para esta semana.</div>;
  }
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis 
            dataKey="day" 
            tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12 }} 
            stroke="var(--color-border)"
        />
        <YAxis 
            allowDecimals={false}
            tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12 }}
            stroke="var(--color-border)"
        />
        <Tooltip
            contentStyle={{ 
                backgroundColor: 'var(--color-background)', 
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--rounded-md)',
            }}
            labelStyle={{ color: 'var(--color-foreground)', fontWeight: 'bold' }}
            formatter={(value: number) => [`${value} ventas`, "Total"]}
        />
        <Bar dataKey="sales" name="Nº de Ventas" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklySalesCountChart;