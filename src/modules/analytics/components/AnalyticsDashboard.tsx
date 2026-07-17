'use client'

import React, { useState, useEffect } from 'react'
import { getAnalyticsData } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, TrendingUp, FolderKanban, Kanban, TrendingDown } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts'

export function AnalyticsDashboard() {
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

  useEffect(() => {
    if (!startDate || !endDate) return
    if (new Date(startDate) > new Date(endDate)) return

    let isMounted = true
    setLoading(true)
    getAnalyticsData(startDate, endDate)
      .then(res => {
        if (isMounted) {
          setData(res)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error('Failed to load analytics', err)
        if (isMounted) setLoading(false)
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Analytics Overview</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Track your workflow performance and financial growth.</p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto ml-auto">
          <div className="flex items-center gap-2">
            <Label htmlFor="start-date" className="sr-only">Start Date</Label>
            <Input 
              id="start-date" 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px] bg-white dark:bg-zinc-950 text-sm"
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
              className="w-[140px] bg-white dark:bg-zinc-950 text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : !data ? (
        <div className="h-[60vh] flex items-center justify-center text-zinc-500">
          Failed to load analytics data.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-6">
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm min-w-0 overflow-hidden md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-500">Collected Revenue</CardTitle>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(data.metrics.totalRevenue, data.metrics.currency)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Selected period</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm min-w-0 overflow-hidden md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-500">Net Profit</CardTitle>
                <div className={`p-2 rounded-lg ${data.metrics.totalNetProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}>
                  {data.metrics.totalNetProfit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${data.metrics.totalNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(data.metrics.totalNetProfit, data.metrics.currency)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Selected period</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm min-w-0 overflow-hidden md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-500">Total Expenses</CardTitle>
                <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(data.metrics.totalExpenses, data.metrics.currency)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Selected period</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm min-w-0 overflow-hidden md:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-500">New Projects</CardTitle>
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                  <FolderKanban className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {data.metrics.totalProjects}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Created in the selected period</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm min-w-0 overflow-hidden md:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-500">Active Pipeline</CardTitle>
                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                  <Kanban className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {data.metrics.activeProjectsCount}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Total projects in progress</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">

            {/* Net Profit Trend */}
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm min-w-0 overflow-hidden lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Net Profit Trend</CardTitle>
                <CardDescription>Cumulative net profit (revenue minus expenses) over the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%" debounce={300}>
                    <AreaChart data={data.netProfitData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorNetProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} minTickGap={30} />
                      <YAxis width={80} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(val) => formatCurrency(val, data.metrics.currency, true)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#3b82f6' }}
                        formatter={(value: any) => [formatCurrency(value, data.metrics.currency), 'Net Profit']}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorNetProfit)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue & Expenses Curve */}
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm min-w-0 overflow-hidden lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Revenue & Expenses</CardTitle>
                <CardDescription>Cumulative overview of money coming in and going out.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%" debounce={300}>
                    <AreaChart data={data.combinedFinanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                        formatter={(value: any, name: any) => [
                          formatCurrency(value, data.metrics.currency), 
                          name ? String(name).charAt(0).toUpperCase() + String(name).slice(1) : ''
                        ]}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            {/* Project Volume */}
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm min-w-0 overflow-hidden col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Project Inflow</CardTitle>
                <CardDescription>New projects created per day.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%" debounce={300}>
                    <BarChart data={data.volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} minTickGap={30} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#6366f1' }}
                        cursor={{ fill: '#3f3f46', opacity: 0.1 }}
                      />
                      <Bar dataKey="count" name="Projects" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Distribution */}
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm min-w-0 overflow-hidden col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Pipeline Distribution</CardTitle>
                <CardDescription>Current snapshot of where active projects are sitting.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full flex items-center justify-center">
                  {data.stageData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" debounce={300}>
                      <PieChart>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        <Pie
                          data={data.stageData}
                          cx="50%"
                          cy="45%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {data.stageData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0)" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-zinc-500 text-sm">No active projects in the pipeline.</div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </>
      )}
    </div>
  )
}
