"use client";

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PaymentTypeDistribution } from '@/lib/data';
import { getPaymentTypeDisplay } from '@/lib/displayTexts';

interface PaymentDistributionChartProps {
  data: PaymentTypeDistribution[];
}

const COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#A855F7', '#6B7280'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

const PaymentDistributionChart: React.FC<PaymentDistributionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-foreground-muted">No hay datos de medios de pago.</div>;
  }

  const chartData = data.map(d => ({
    ...d,
    name: getPaymentTypeDisplay(d.paymentType),
  }));

  const total = chartData.reduce((sum, d) => sum + d.total, 0);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={50}
          paddingAngle={3}
          stroke="var(--color-background)"
          strokeWidth={2}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, _: any, props: any) => [
            `${formatCurrency(value)} (${((value / total) * 100).toFixed(1)}%)`,
            props.payload.name,
          ]}
          contentStyle={{
            backgroundColor: 'var(--color-background)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--rounded-md)',
          }}
          labelStyle={{ color: 'var(--color-foreground)', fontWeight: 'bold' }}
        />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 13, paddingTop: '10px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PaymentDistributionChart;
