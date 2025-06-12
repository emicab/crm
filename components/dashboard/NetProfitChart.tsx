// components/dashboard/NetProfitChart.tsx
"use client";

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyFinancialSummary } from '@/lib/data';

interface NetProfitChartProps {
  data: MonthlyFinancialSummary[];
}

const NetProfitChart: React.FC<NetProfitChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-foreground-muted py-8">No hay datos de rentabilidad para mostrar.</div>;
  }
  
  const formatCurrencyForTooltip = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };
  
  const formatMonth = (monthString: string) => {
      const [year, month] = monthString.split('-');
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleString('es-AR', { month: 'short', year: '2-digit' });
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={data}
        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis 
            dataKey="month" 
            tickFormatter={formatMonth}
            tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12 }}
            stroke="var(--color-border)"
        />
        <YAxis
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} // Formatear en miles
            tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12 }}
            stroke="var(--color-border)"
        />
        <Tooltip
            formatter={(value: number) => formatCurrencyForTooltip(value)}
            contentStyle={{ 
                backgroundColor: 'var(--color-background)', 
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--rounded-md)',
            }}
            labelStyle={{ color: 'var(--color-foreground)', fontWeight: 'bold' }}
        />
        <Legend wrapperStyle={{ fontSize: 14, paddingTop: '10px' }} />
        <Bar dataKey="totalRevenue" name="Ingresos" fill="var(--color-primary-light)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="totalExpenses" name="Gastos" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
        <Line 
            type="monotone" 
            dataKey="netProfit" 
            name="Ganancia Neta" 
            stroke="var(--color-success)" // Una línea verde para la ganancia
            strokeWidth={3}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default NetProfitChart;