'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send, Download, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { sendExportAndMarkDelivered } from '../actions'

export type DeletionRow = {
  id: string
  userId: string | null
  userEmail: string | null
  reason: string
  status: string
  requestedAt: string
  dataDeliveredAt: string | null
  deliveredBy: string | null
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  AWAITING_DATA: { text: 'Awaiting data', className: 'text-amber-600 dark:text-amber-400' },
  DATA_DELIVERED: { text: 'Data delivered', className: 'text-green-600 dark:text-green-400' },
  COMPLETED: { text: 'Account deleted', className: 'text-zinc-500' },
  CANCELLED: { text: 'Cancelled', className: 'text-zinc-500' },
}

export function DeletionQueue({ requests }: { requests: DeletionRow[] }) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  const handleSend = async (id: string) => {
    setPending(id)
    try {
      const result = await sendExportAndMarkDelivered(id)
      if (result.success) {
        toast.success('Export emailed and marked delivered')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Could not send the export')
      }
    } finally {
      setPending(null)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-sm text-zinc-500">No account deletion requests.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((r) => {
        const status = STATUS_LABEL[r.status] ?? { text: r.status, className: 'text-zinc-500' }
        const isOpen = r.status === 'AWAITING_DATA'

        return (
          <div
            key={r.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {/* Cleared once deletion completes, which is the intended end state. */}
                  {r.userEmail ?? <span className="italic text-zinc-500">details removed</span>}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Requested{' '}
                  {new Date(r.requestedAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {r.dataDeliveredAt &&
                    ` · delivered ${new Date(r.dataDeliveredAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'long',
                    })}${r.deliveredBy ? ` by ${r.deliveredBy}` : ''}`}
                </p>
              </div>
              <span className={`text-xs font-semibold shrink-0 ${status.className}`}>
                {status.text}
              </span>
            </div>

            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 mb-4">
              <p className="text-xs font-medium text-zinc-500 mb-1">Reason given</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{r.reason}</p>
            </div>

            {isOpen && r.userId && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleSend(r.id)}
                  disabled={pending === r.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {pending === r.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Email data and mark delivered
                    </>
                  )}
                </button>
                <a
                  href={`/hq/api/export/user?userId=${encodeURIComponent(r.userId)}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Download className="w-4 h-4" /> Preview export
                </a>
              </div>
            )}

            {r.status === 'DATA_DELIVERED' && (
              <p className="flex items-center gap-2 text-sm text-zinc-500">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Waiting for the user to complete deletion.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
