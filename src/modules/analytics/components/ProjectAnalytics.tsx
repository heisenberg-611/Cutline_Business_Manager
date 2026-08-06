'use client'

import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Cell,
} from 'recharts'
import { formatMoney, formatMoneyCompact } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle2, Clock, FolderKanban, ListChecks, Table2 } from 'lucide-react'
import type { ProjectAnalytics as ProjectAnalyticsData } from '../project-analytics'

/**
 * Colours are roles, not decisions made at each call site.
 *
 * Validated with the data-viz palette validator against this app's own chart
 * surfaces (#FFFFFF light, #0A0A0A dark), not the reference defaults: all four
 * task-status hues pass the lightness band, chroma floor, CVD separation and
 * normal-vision floor in both modes. Two light-mode hues (aqua, yellow) sit
 * below 3:1 on white, which obliges visible labels — every status is direct-
 * labelled and repeated in the table view below, so identity is never carried
 * by colour alone.
 */
const SERIES = {
  // One hue for the ranked bars: length already encodes magnitude, so a
  // per-bar ramp would be redundant ink. A single series needs no legend.
  revenue: { light: '#2a78d6', dark: '#3987e5' },
  delivered: { light: '#1baf7a', dark: '#199e70' },
  status: {
    TODO: { light: '#2a78d6', dark: '#3987e5' },
    IN_PROGRESS: { light: '#eb6834', dark: '#d95926' },
    BLOCKED: { light: '#eda100', dark: '#c98500' },
    DONE: { light: '#1baf7a', dark: '#199e70' },
  },
} as const

const GRID = 'var(--chart-grid)'
const MUTED = 'var(--chart-muted)'

function useIsDark() {
  const [dark, setDark] = useState(false)
  React.useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains('dark'))
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

const pick = (slot: { light: string; dark: string }, dark: boolean) => (dark ? slot.dark : slot.light)

/** Shared tooltip shell: text in ink tokens, never in the series colour. */
function TooltipCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg dark:border-white/10 dark:bg-zinc-900">
      <p className="mb-1 text-xs font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="text-xs text-zinc-500 dark:text-zinc-400">
          {row.label}: <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-200">{row.value}</span>
        </p>
      ))}
    </div>
  )
}

export function ProjectAnalytics({ data }: { data: ProjectAnalyticsData }) {
  const dark = useIsDark()
  const { metrics } = data
  const [showTable, setShowTable] = useState(false)

  const money = (cents: number) => formatMoney(cents, metrics.currency)
  const moneyShort = (cents: number) => formatMoneyCompact(cents, metrics.currency)

  const revenueRows = useMemo(
    () => data.revenueByProject.map((r) => ({ ...r, paid: r.paidCents / 100 })),
    [data.revenueByProject]
  )

  // Height grows with the row count so bars stay ≤24px and labels never collide.
  const rankedHeight = Math.max(180, revenueRows.length * 40 + 40)

  const statusTotal = data.taskStatus.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={CheckCircle2}
          label="Delivered"
          value={String(metrics.deliveredCount)}
          detail={`${metrics.activeCount} still in flight`}
        />
        <StatTile
          icon={Clock}
          label="Median time to deliver"
          value={metrics.medianDaysToDeliver === null ? '—' : `${metrics.medianDaysToDeliver}d`}
          detail={metrics.medianDaysToDeliver === null ? 'Nothing delivered yet' : 'Brief to delivery'}
        />
        <StatTile
          icon={ListChecks}
          label="Tasks done"
          value={`${Math.round(metrics.taskCompletionRate)}%`}
          detail={`${metrics.tasksDone} of ${metrics.tasksTotal}`}
          meter={metrics.taskCompletionRate}
        />
        <StatTile
          icon={FolderKanban}
          label="Collected"
          value={`${Math.round(metrics.collectionRate)}%`}
          detail="Of everything invoiced"
          meter={metrics.collectionRate}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Revenue by project</CardTitle>
            <CardDescription>
              Cash collected per project, highest first. Hover for what is still outstanding.
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
          >
            <Table2 className="h-3.5 w-3.5" />
            {showTable ? 'Chart' : 'Table'}
          </button>
        </CardHeader>
        <CardContent>
          {revenueRows.length === 0 ? (
            <Empty>No invoiced projects in this workspace yet.</Empty>
          ) : showTable ? (
            <RevenueTable rows={data.revenueByProject} money={money} />
          ) : (
            <ResponsiveContainer width="100%" height={rankedHeight}>
              <BarChart data={revenueRows} layout="vertical" margin={{ left: 8, right: 56, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke={GRID} strokeWidth={1} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => moneyShort(v * 100)}
                  tick={{ fill: MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="title"
                  width={150}
                  tick={{ fill: MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0].payload as (typeof revenueRows)[number]
                    return (
                      <TooltipCard
                        title={row.title}
                        rows={[
                          ...(row.client ? [{ label: 'Client', value: row.client }] : []),
                          { label: 'Collected', value: money(row.paidCents) },
                          { label: 'Outstanding', value: money(row.outstandingCents) },
                          { label: 'Status', value: row.isDelivered ? 'Delivered' : 'In progress' },
                        ]}
                      />
                    )
                  }}
                />
                {/* 4px rounded data-end, square at the baseline; capped at 24px. */}
                <Bar dataKey="paid" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
                  {revenueRows.map((row) => (
                    <Cell key={row.projectId} fill={pick(SERIES.revenue, dark)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projects delivered</CardTitle>
            <CardDescription>
              When work reached the final stage of your pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.deliveredOverTime} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="deliveredWash" x1="0" y1="0" x2="0" y2="1">
                    {/* ~10% wash, never a saturated block. */}
                    <stop offset="0%" stopColor={pick(SERIES.delivered, dark)} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={pick(SERIES.delivered, dark)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const n = Number(payload[0].value ?? 0)
                    return (
                      <TooltipCard
                        title={String(label)}
                        rows={[{ label: 'Delivered', value: `${n} project${n === 1 ? '' : 's'}` }]}
                      />
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  stroke={pick(SERIES.delivered, dark)}
                  strokeWidth={2}
                  fill="url(#deliveredWash)"
                  isAnimationActive={false}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: dark ? '#0A0A0A' : '#FFFFFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task backlog</CardTitle>
            <CardDescription>Every task in the workspace, by state.</CardDescription>
          </CardHeader>
          <CardContent>
            {statusTotal === 0 ? (
              <Empty>No tasks yet.</Empty>
            ) : (
              <TaskStatusBar statuses={data.taskStatus} total={statusTotal} dark={dark} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Part-to-whole across four states — a horizontal stacked bar rather than a pie,
 * which stops being readable past a few slices and cannot be labelled in place.
 *
 * Built in plain markup rather than a chart component: it is one row of four
 * proportions, and the 2px surface gaps that separate the segments are simply
 * the container's background showing through.
 */
function TaskStatusBar({
  statuses,
  total,
  dark,
}: {
  statuses: { status: string; label: string; count: number }[]
  total: number
  dark: boolean
}) {
  const present = statuses.filter((s) => s.count > 0)

  return (
    <div className="space-y-4">
      <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded">
        {present.map((s) => (
          <div
            key={s.status}
            title={`${s.label}: ${s.count}`}
            style={{
              width: `${(s.count / total) * 100}%`,
              backgroundColor: pick(
                SERIES.status[s.status as keyof typeof SERIES.status],
                dark
              ),
            }}
            className="first:rounded-l last:rounded-r"
          />
        ))}
      </div>

      {/* Legend and direct labels together: two of the light-mode hues fall
          below 3:1 on white, so the count is never carried by colour alone. */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {statuses.map((s) => (
          <div key={s.status} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{
                backgroundColor: pick(
                  SERIES.status[s.status as keyof typeof SERIES.status],
                  dark
                ),
              }}
            />
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</dt>
            <dd className="ml-auto text-xs font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
              {s.count}
              <span className="ml-1 text-zinc-400">
                {total > 0 ? `${Math.round((s.count / total) * 100)}%` : '0%'}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function RevenueTable({
  rows,
  money,
}: {
  rows: ProjectAnalyticsData['revenueByProject']
  money: (cents: number) => string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left dark:border-white/10">
            <th className="py-2 pr-4 font-medium text-zinc-500">Project</th>
            <th className="py-2 pr-4 font-medium text-zinc-500">Client</th>
            <th className="py-2 pr-4 text-right font-medium text-zinc-500">Collected</th>
            <th className="py-2 text-right font-medium text-zinc-500">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.projectId} className="border-b border-zinc-100 last:border-0 dark:border-white/5">
              <td className="py-2 pr-4 text-zinc-800 dark:text-zinc-200">{row.title}</td>
              <td className="py-2 pr-4 text-zinc-500">{row.client || '—'}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                {money(row.paidCents)}
              </td>
              <td className="py-2 text-right tabular-nums text-zinc-500">
                {money(row.outstandingCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  meter,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail: string
  /** 0–100; draws a same-hue track under the value. */
  meter?: number
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-zinc-500">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
        {meter !== undefined && (
          <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <span
              className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
              style={{ width: `${Math.min(100, Math.max(0, meter))}%` }}
            />
          </span>
        )}
        <p className="mt-1.5 text-xs text-zinc-400">{detail}</p>
      </CardContent>
    </Card>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">{children}</p>
  )
}
