'use client'

import React, { useState, useEffect } from 'react'
import { getAnalyticsData } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, TrendingUp, Briefcase, LayoutDashboard } from 'lucide-react'
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
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    getAnalyticsData(parseInt(days))
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
  }, [days])

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0
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
        
        <div className="w-full sm:w-48">
          <Select value={days} onValueChange={(val) => { if (val) setDays(val) }}>
            <SelectTrigger className="bg-white dark:bg-zinc-950">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last 365 Days</SelectItem>
            </SelectContent>
          </Select>
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-500">Collected Revenue</CardTitle>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(data.metrics.totalRevenue, data.metrics.currency)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">In the last {days} days</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-500">New Projects</CardTitle>
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                  <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {data.metrics.totalProjects}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Created in the last {days} days</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-500">Active Pipeline</CardTitle>
                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                  <LayoutDashboard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {data.metrics.activeProjectsCount}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Total projects in progress</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Revenue Trend */}
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Revenue Trend</CardTitle>
                <CardDescription>Daily revenue collected over the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} minTickGap={30} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(val) => `$${val}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#10b981' }}
                        formatter={(value: any) => [formatCurrency(value, data.metrics.currency), 'Revenue']}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Project Volume */}
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Project Inflow</CardTitle>
                <CardDescription>New projects created per day.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
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
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 shadow-sm col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Pipeline Distribution</CardTitle>
                <CardDescription>Current snapshot of where active projects are sitting.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full flex items-center justify-center">
                  {data.stageData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
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
