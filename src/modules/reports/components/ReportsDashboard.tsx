'use client'

import { useState, useEffect } from 'react'
import { getReportData } from '../actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DollarSign, Clock, Briefcase, TrendingUp, Loader2 } from 'lucide-react'

// Define the type to match the action return type
type ReportData = {
  finance: {
    totalRevenueCents: number
    outstandingBalanceCents: number
    topClients: { name: string, amount: number }[]
  }
  work: {
    totalDurationMinutes: number
    newProjectsCount: number
    topProjectsByTime: { title: string, minutes: number }[]
  }
}

export function ReportsDashboard() {
  // Default to the last 30 days
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
  
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ReportData | null>(null)

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const formatHours = (minutes: number) => {
    return (minutes / 60).toFixed(1) + 'h'
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const result = await getReportData(startDate, endDate)
      setData(result)
    } catch (err) {
      console.error(err)
      alert('Failed to load report data.')
    } finally {
      setLoading(false)
    }
  }

  // Load initially
  useEffect(() => {
    fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-8">
      {/* Date Controls */}
      <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900/50"
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900/50"
              />
            </div>
            <Button 
              onClick={fetchReport} 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Collected Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {data ? formatMoney(data.finance.totalRevenueCents) : '$0.00'}
            </div>
            <p className="text-xs text-zinc-500 mt-1">From paid invoices</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Outstanding Balances</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {data ? formatMoney(data.finance.outstandingBalanceCents) : '$0.00'}
            </div>
            <p className="text-xs text-zinc-500 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Time Logged</CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {data ? formatHours(data.work.totalDurationMinutes) : '0.0h'}
            </div>
            <p className="text-xs text-zinc-500 mt-1">Total billable & non-billable</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">New Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-fuchsia-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {data ? data.work.newProjectsCount : 0}
            </div>
            <p className="text-xs text-zinc-500 mt-1">Started in this period</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Top Clients by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {(!data || data.finance.topClients.length === 0) ? (
              <div className="text-sm text-zinc-500 py-4 text-center">No revenue data for this period.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.finance.topClients.map((client, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">{client.name}</TableCell>
                      <TableCell className="text-right">{formatMoney(client.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Top Projects by Time</CardTitle>
          </CardHeader>
          <CardContent>
            {(!data || data.work.topProjectsByTime.length === 0) ? (
              <div className="text-sm text-zinc-500 py-4 text-center">No time logged in this period.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Title</TableHead>
                    <TableHead className="text-right">Hours Logged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.work.topProjectsByTime.map((proj, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">{proj.title}</TableCell>
                      <TableCell className="text-right">{formatHours(proj.minutes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
