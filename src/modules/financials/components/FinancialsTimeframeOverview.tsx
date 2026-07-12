'use client'

import React, { useState, useEffect } from 'react'
import { getFinancialOverviewByDateRange } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function FinancialsTimeframeOverview() {
  // Default to last 30 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!startDate || !endDate) return
    
    // Basic validation
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before or equal to end date")
      return
    }
    
    setError(null)
    let isMounted = true
    setLoading(true)
    
    getFinancialOverviewByDateRange(startDate, endDate)
      .then(res => {
        if (isMounted) {
          setData(res)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error('Failed to load financial overview', err)
        if (isMounted) {
          setError("Failed to load data")
          setLoading(false)
        }
      })
      
    return () => { isMounted = false }
  }, [startDate, endDate])

  const formatCurrency = (amount: number, currency: string, compact: boolean = false) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
      ...(compact ? { notation: 'compact', compactDisplay: 'short' } : {})
    }).format(amount)
  }

  // Combine revenue and expense data for a single chart
  const combinedData = React.useMemo(() => {
    if (!data) return []
    const map: Record<string, any> = {}
    
    data.revenueData.forEach((r: any) => {
      map[r.date] = { date: r.date, revenue: r.amount, expenses: 0 }
    })
    
    data.expenseData.forEach((e: any) => {
      if (!map[e.date]) {
        map[e.date] = { date: e.date, revenue: 0, expenses: e.amount }
      } else {
        map[e.date].expenses = e.amount
      }
    })
    
    // Sort chronologically (assuming the dates are sequential and parseable, or just rely on the existing sorted order from eachDayOfInterval)
    return Object.values(map)
  }, [data])

  return (
    <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg">Custom Timeframe Overview</CardTitle>
            <CardDescription>View collected revenue and expenses for a specific date range.</CardDescription>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-2">
              <Label htmlFor="start-date" className="sr-only">Start Date</Label>
              <Input 
                id="start-date" 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px] text-sm"
              />
            </div>
            <span className="text-zinc-500">to</span>
            <div className="flex items-center gap-2">
              <Label htmlFor="end-date" className="sr-only">End Date</Label>
              <Input 
                id="end-date" 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px] text-sm"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="h-[250px] flex items-center justify-center text-red-500 text-sm">
            {error}
          </div>
        ) : loading ? (
          <div className="h-[250px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : !data ? (
          <div className="h-[250px] flex items-center justify-center text-zinc-500 text-sm">
            No data available.
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Collected Revenue</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {formatCurrency(data.metrics.totalRevenue, data.metrics.currency)}
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-2 text-red-500/80 mb-1">
                  <TrendingUp className="w-4 h-4 rotate-180" />
                  <span className="text-xs font-medium uppercase tracking-wider">Total Expenses</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {formatCurrency(data.metrics.totalExpenses, data.metrics.currency)}
                </div>
              </div>
            </div>

            {/* Combined Chart */}
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} minTickGap={30} />
                  <YAxis width={80} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(val) => formatCurrency(val, data.metrics.currency, true)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any, name: string) => [
                      formatCurrency(value, data.metrics.currency), 
                      name.charAt(0).toUpperCase() + name.slice(1)
                    ]}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
