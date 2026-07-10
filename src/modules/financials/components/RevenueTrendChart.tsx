'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface Props {
  data: {
    month: string
    revenue: number
  }[]
  currency?: string
}

export function RevenueTrendChart({ data, currency = 'USD' }: Props) {
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <div className="w-full h-[250px] mt-4 text-zinc-900 dark:text-zinc-100">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(163,163,163,0.2)" />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#737373' }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency,
              notation: 'compact',
              maximumFractionDigits: 0
            }).format(val)}
            tick={{ fontSize: 12, fill: '#737373' }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(163,163,163,0.1)' }}
            contentStyle={{ 
              borderRadius: '8px', 
              border: '1px solid rgba(163,163,163,0.2)',
              backgroundColor: 'var(--card)',
              color: 'var(--card-foreground)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            formatter={(value: any) => [formatMoney(value), 'Revenue']}
            labelStyle={{ color: '#737373', marginBottom: '4px' }}
          />
          <Bar 
            dataKey="revenue" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            fill="currentColor"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
