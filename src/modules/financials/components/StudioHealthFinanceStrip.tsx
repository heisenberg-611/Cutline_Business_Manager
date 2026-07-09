import React from 'react'
import { TrendingUp, Clock, AlertTriangle, Calendar } from 'lucide-react'

interface Props {
  data: {
    revenueMTD: number
    outstanding: number
    overdue: number
    dso: number
    currency?: string
  }
}

export function StudioHealthFinanceStrip({ data }: Props) {
  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency || 'USD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  return (
    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-white/10 bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      
      {/* Revenue MTD */}
      <div className="flex-1 p-5 group hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
          <TrendingUp className="w-4 h-4" />
          <h3 className="text-xs font-medium uppercase tracking-wider">Revenue (MTD)</h3>
        </div>
        <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight">
          {formatMoney(data.revenueMTD)}
        </p>
      </div>

      {/* Outstanding */}
      <div className="flex-1 p-5 group hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
          <Clock className="w-4 h-4" />
          <h3 className="text-xs font-medium uppercase tracking-wider">Outstanding</h3>
        </div>
        <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight">
          {formatMoney(data.outstanding)}
        </p>
      </div>

      {/* Overdue */}
      <div className="flex-1 p-5 group hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
        <div className="flex items-center gap-2 text-red-500/80 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="text-xs font-medium uppercase tracking-wider">Overdue</h3>
        </div>
        <p className={`text-3xl font-mono tracking-tight ${data.overdue > 0 ? 'text-red-600 dark:text-red-500' : 'text-zinc-900 dark:text-white'}`}>
          {formatMoney(data.overdue)}
        </p>
      </div>

      {/* DSO */}
      <div className="flex-1 p-5 group hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
          <Calendar className="w-4 h-4" />
          <h3 className="text-xs font-medium uppercase tracking-wider">DSO (Days)</h3>
        </div>
        <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight">
          {data.dso || 'N/A'}
        </p>
      </div>

    </div>
  )
}
