'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock, Loader2, MailCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { DeletionScope } from '@/lib/account-deletion'
import { requestAccountDeletion, cancelAccountDeletion, deleteMyAccount } from '../actions'

type RequestState = {
  status: string
  requestedAt: string
  dataDeliveredAt: string | null
}

/**
 * One component rendering whichever step applies, because the steps are
 * mutually exclusive and the server already knows which one is current.
 */
export function DeletionFlow({
  scope,
  request,
}: {
  scope: DeletionScope
  request: RequestState | null
}) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isPending, setIsPending] = useState(false)

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>) => {
    setIsPending(true)
    try {
      const result = await fn()
      if (!result.success) {
        toast.error(result.error ?? 'Something went wrong')
        return false
      }
      router.refresh()
      return true
    } finally {
      setIsPending(false)
    }
  }

  // Owning a workspace other people work in is a dead end until it is resolved,
  // so say so before anything else rather than after an export has been sent.
  if (scope.kind === 'SHARED_OWNER' && !request) {
    return (
      <div className="flex gap-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-5">
        <Users className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
            Your workspace has other members
          </h4>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            You own <strong>{scope.businessName}</strong>, which {scope.otherMembers} other{' '}
            {scope.otherMembers === 1 ? 'person is' : 'people are'} still a member of. Deleting your
            account would take their clients, projects and invoices with it.
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-2">
            Transfer ownership or remove the other members first, then come back here.
          </p>
        </div>
      </div>
    )
  }

  if (request?.status === 'AWAITING_DATA') {
    return (
      <div className="space-y-4">
        <div className="flex gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <Clock className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-1">We are preparing your data</h4>
            <p className="text-sm text-muted-foreground">
              Requested{' '}
              {new Date(request.requestedAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              . We will email you a full copy of your data, and once it has arrived you will be able
              to complete the deletion from this page. Nothing has been deleted yet.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(cancelAccountDeletion).then((ok) => ok && toast.success('Request cancelled'))}
          className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline disabled:opacity-50"
        >
          Cancel this request
        </button>
      </div>
    )
  }

  if (request?.status === 'DATA_DELIVERED') {
    return (
      <div className="space-y-6">
        <div className="flex gap-4 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-5">
          <MailCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">
              Thank you for being with us
            </h4>
            <p className="text-sm text-green-800 dark:text-green-300">
              Your data was sent to you
              {request.dataDeliveredAt
                ? ` on ${new Date(request.dataDeliveredAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}`
                : ''}
              . We are sorry to see you go, and grateful for the time you spent building here.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 dark:border-red-900 p-5">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            What deleting your account does
          </h4>
          <ul className="text-sm text-muted-foreground space-y-2 mb-4 list-disc pl-5">
            <li>
              Your account and{' '}
              {scope.kind === 'SOLO_OWNER' ? (
                <>
                  the <strong>{scope.businessName}</strong> workspace
                </>
              ) : (
                'your workspace membership'
              )}{' '}
              are removed immediately.
            </li>
            {scope.kind === 'SOLO_OWNER' && (
              <li>
                Every client, project, task, file, invoice, payment, expense, message and piece of
                feedback in that workspace is deleted with it.
              </li>
            )}
            <li>
              Deletion is <strong>permanent and cannot be undone</strong>. We keep no copies, no
              backups you can be restored from, and no archived version of your records.
            </li>
            <li>
              All we retain is a dated note that a deletion request was made and honoured, along
              with the reason you gave. It contains nothing that identifies you.
            </li>
            <li>The copy of your data we emailed you is the only copy that will exist.</li>
          </ul>

          <label htmlFor="confirm" className="block text-sm font-medium mb-2">
            Type <span className="font-mono font-semibold">DELETE</span> to confirm
          </label>
          <input
            id="confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE"
            className="block w-full max-w-xs rounded-xl border-0 py-2.5 px-4 mb-4 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm bg-white dark:bg-zinc-950"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending || confirmation !== 'DELETE'}
              onClick={async () => {
                const ok = await run(() => deleteMyAccount(confirmation))
                // Their session is gone with the account; Clerk's sign-out route
                // clears it and lands them somewhere that still exists.
                if (ok) window.location.href = '/'
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete my account permanently'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(cancelAccountDeletion).then((ok) => ok && toast.success('Request cancelled'))}
              className="rounded-xl bg-zinc-100 dark:bg-zinc-900 px-5 py-2.5 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              Keep my account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          You can close your account at any time. So that you never lose anything by leaving, we
          send you a complete copy of your data first — deletion only becomes available once that
          copy has reached you.
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Tell us why you are leaving and request your data.</li>
          <li>We prepare and email you a full export.</li>
          <li>You return here to permanently delete your account.</li>
        </ol>
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium mb-2">
          Why are you leaving?
        </label>
        <textarea
          id="reason"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="It helps us understand what we could have done better."
          className="block w-full rounded-xl border-0 py-3 px-4 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-white dark:bg-zinc-950 resize-none"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Nothing is deleted at this step. You can cancel any time before the final confirmation.
        </p>
      </div>

      <button
        type="button"
        disabled={isPending || reason.trim().length < 10}
        onClick={() =>
          run(() => requestAccountDeletion(reason)).then(
            (ok) => ok && toast.success('Request received. We will email your data shortly.')
          )
        }
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request my data and begin'}
      </button>
    </div>
  )
}
