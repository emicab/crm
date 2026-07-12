"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TopSellingProductData } from '@/lib/data';

interface TopSellingChartProps {
  data: TopSellingProductData[];
}

const TopSellingChart: React.FC<TopSellingChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-foreground-muted">No hay datos de productos más vendidos.</div>;
  }

  const chartData = [...data].reverse();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
          width={150}
          tick={{ fill: 'var(--color-foreground-muted)', fontSize: 11 }}
          stroke="var(--color-border)"
        />
        <Tooltip
          formatter={(value: number) => [`${value} unidades`, 'Vendidos']}
          contentStyle={{
            backgroundColor: 'var(--color-background)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--rounded-md)',
          }}
          labelStyle={{ color: 'var(--color-foreground)', fontWeight: 'bold' }}
        />
        <Bar
          dataKey="totalSold"
          name="Vendidos"
          fill="var(--color-primary)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopSellingChart;
