import React from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, Activity, Star, Clock } from 'lucide-react'

interface Props {
  variant?: 'main' | 'finance'
  data: {
    revenueMTD: number
    revenueLastMonth: number
    revenueDelta: number
    expenseTotal: number
    outstanding: number
    overdue: number
    utilization: number
    atRiskCount: number
    avgFeedback: number
    dso?: number
    currency?: string
  }
}

export function StudioHealthFinanceStrip({ data, variant = 'main' }: Props) {
  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency || 'USD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  return (
    <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-white/10 bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      
      {/* Revenue MTD (Always shown, or shown differently?) */}
      {/* Both main and finance show revenue */}
      <div className="flex-1 p-5 group bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
          <TrendingUp className="w-4 h-4" />
          <h3 className="text-xs font-medium uppercase tracking-wider">Revenue (MTD)</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight">
            {formatMoney(data.revenueMTD)}
          </p>
          {data.revenueLastMonth > 0 && (
            <span className={`text-xs font-medium ${data.revenueDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {data.revenueDelta >= 0 ? '+' : ''}{data.revenueDelta.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {variant === 'finance' && (
        <div className="flex-1 p-5 group bg-red-50/70 dark:bg-red-950/20 hover:bg-red-100/70 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 text-red-500/80 mb-2">
            <TrendingDown className="w-4 h-4" />
            <h3 className="text-xs font-medium uppercase tracking-wider">Total Expenses</h3>
          </div>
          <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight">
            {formatMoney(data.expenseTotal)}
          </p>
        </div>
      )}

      {/* Finance variant: Outstanding */}
      {variant === 'finance' && (
        <div className="flex-1 p-5 group bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
            <Activity className="w-4 h-4" />
            <h3 className="text-xs font-medium uppercase tracking-wider">Outstanding</h3>
          </div>
          <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight">
            {formatMoney(data.outstanding)}
          </p>
        </div>
      )}

      {/* Main variant: Utilization */}
      {variant === 'main' && (
        <div className="flex-1 p-5 group bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Activity className="w-4 h-4" />
            <h3 className="text-xs font-medium uppercase tracking-wider">Utilization</h3>
          </div>
          <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight">
            {data.utilization.toFixed(1)}%
          </p>
        </div>
      )}

      {/* Main variant: At-Risk Deadlines */}
      {variant === 'main' && (
        <div className="flex-1 p-5 group bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
            <Calendar className="w-4 h-4" />
            <h3 className="text-xs font-medium uppercase tracking-wider">At-Risk Deadlines</h3>
          </div>
          <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight">
            {data.atRiskCount}
          </p>
        </div>
      )}

      {/* Overdue (Finance variant only, per latest request) */}
      {variant === 'finance' && (
        <div className="flex-1 p-5 group bg-red-50/70 dark:bg-red-950/20 hover:bg-red-100/70 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 text-red-500/80 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-xs font-medium uppercase tracking-wider">Overdue Invoices</h3>
          </div>
          <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight">
            {formatMoney(data.overdue)}
          </p>
        </div>
      )}

      {/* Main variant: Avg Feedback */}
      {variant === 'main' && (
        <div className="flex-1 p-5 group bg-yellow-50/70 dark:bg-yellow-950/20 hover:bg-yellow-100/70 dark:hover:bg-yellow-950/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-2">
            <Star className="w-4 h-4" />
            <h3 className="text-xs font-medium uppercase tracking-wider">Avg Feedback</h3>
          </div>
          <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight flex items-center gap-1">
            {data.avgFeedback > 0 ? data.avgFeedback.toFixed(1) : 'N/A'}
          </p>
        </div>
      )}

      {/* Finance variant: DSO */}
      {variant === 'finance' && (
        <div className="flex-1 p-5 group bg-violet-50/70 dark:bg-violet-950/20 hover:bg-violet-100/70 dark:hover:bg-violet-950/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-2">
            <Clock className="w-4 h-4" />
            <h3 className="text-xs font-medium uppercase tracking-wider">DSO</h3>
          </div>
          <p className="text-3xl font-mono text-zinc-900 dark:text-white tracking-tight flex items-center gap-1">
            {data.dso !== undefined ? data.dso.toFixed(0) : '0'} <span className="text-sm font-medium text-zinc-500">days</span>
          </p>
        </div>
      )}

    </div>
  )
}
