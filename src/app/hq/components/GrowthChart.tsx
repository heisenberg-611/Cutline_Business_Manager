'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function GrowthChart({ data }: { data: { month: string; signups: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-zinc-500">
        No growth data available
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeWidth={1} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 12 }}
            dx={-10}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderColor: 'var(--tooltip-border, #e4e4e7)', borderRadius: '8px' }}
            itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
            cursor={{ fill: '#f4f4f5', opacity: 0.5 }}
            formatter={(value: any) => [value, 'New Organizations']}
          />
          <Bar 
            dataKey="signups" 
            fill="#0ea5e9" 
            radius={[4, 4, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
