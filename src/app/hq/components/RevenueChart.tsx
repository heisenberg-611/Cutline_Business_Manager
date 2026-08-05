'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatHqMoney, compactNumber, DEFAULT_HQ_CURRENCY } from '@/lib/hq-money';

export function RevenueChart({
  data,
  currencyCode = DEFAULT_HQ_CURRENCY,
}: {
  data: { month: string; revenue: number }[];
  currencyCode?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-zinc-500">
        No revenue data available
      </div>
    );
  }

  return (
    // Relative so the unit caption can sit in the plot's top-left corner without
    // relying on Recharts label positioning, which clips at narrow widths.
    <div className="relative h-[300px] w-full">
      <span className="absolute left-0 top-0 z-10 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {currencyCode}
      </span>

      <ResponsiveContainer width="100%" height="100%">
        {/* Left margin reserves room for the widest tick. It was 0, so any
            formatted amount ran off the edge of the plot. */}
        <AreaChart data={data} margin={{ top: 24, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Hairline and solid: a dashed grid competes with the data line. */}
          <CartesianGrid
            vertical={false}
            stroke="#e4e4e7"
            strokeWidth={1}
            className="dark:stroke-zinc-800"
          />

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
            // Compact and currency-free. The unit is stated once above; a full
            // "BDT 2,988" on every tick is what made this unreadable.
            tickFormatter={compactNumber}
            width={44}
            // A revenue axis that does not start at zero exaggerates change.
            domain={[0, 'auto']}
            allowDecimals={false}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e4e4e7',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            // Text tokens, not the series colour — the coloured mark carries
            // identity, coloured text just reads as low contrast.
            itemStyle={{ color: '#18181b', fontWeight: 600 }}
            labelStyle={{ color: '#71717a' }}
            formatter={(value) => [
              formatHqMoney(Number(value ?? 0), currencyCode),
              'Revenue',
            ]}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#4f46e5"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            // Visible anchors, so a single month still reads as a data point.
            dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
