"use client";

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/formatCurrency';
import type { DailySalesData } from '@/lib/data';

interface DailyRevenueChartProps {
  data: DailySalesData[];
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

const DailyRevenueChart: React.FC<DailyRevenueChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-foreground-muted">No hay datos de ingresos diarios.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: 'var(--color-foreground-muted)', fontSize: 11 }}
          stroke="var(--color-border)"
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: 'var(--color-foreground-muted)', fontSize: 12 }}
          stroke="var(--color-border)"
        />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
          labelFormatter={(label: string) => formatDate(label)}
          contentStyle={{
            backgroundColor: 'var(--color-background)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--rounded-md)',
          }}
          labelStyle={{ color: 'var(--color-foreground)', fontWeight: 'bold' }}
        />
        <Area
          type="monotone"
          dataKey="totalSales"
          name="Ingresos"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default DailyRevenueChart;
