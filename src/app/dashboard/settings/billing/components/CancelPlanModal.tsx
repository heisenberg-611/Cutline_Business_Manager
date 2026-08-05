'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cancelSubscription } from '../actions';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Cancelling is irreversible and immediate: it ends the plan, forfeits whatever
 * is left of the period already paid for, and — because payment is manual and
 * fulfilled by an admin — coming back is not self-service. It previously
 * happened on a single unguarded click, so this states the cost plainly and
 * makes the user type nothing they can do by accident.
 */
export function CancelPlanModal({
  planName,
  daysLeft,
  periodEndLabel,
}: {
  planName: string;
  /**
   * Both computed on the server. Reading the clock while rendering is impure
   * and would let the server and client disagree about the remaining days.
   */
  daysLeft: number;
  periodEndLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleCancel = async () => {
    setIsPending(true);
    try {
      await cancelSubscription();
      // No success state: the action revalidates and this modal unmounts with
      // the plan card it belongs to.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel the plan');
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-center text-sm font-semibold text-red-600 dark:text-red-400 shadow-sm hover:bg-red-100 dark:hover:bg-red-900/50 ring-1 ring-inset ring-red-200 dark:ring-red-900 transition-colors"
      >
        Cancel Plan
      </button>

      <DialogContent className="sm:max-w-[500px] bg-background rounded-3xl p-8 border border-border/50 shadow-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Cancel your {planName} plan</DialogTitle>
        </DialogHeader>

        <div className="w-14 h-14 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
        </div>

        <h3 className="text-2xl font-semibold mb-3">Cancel your {planName} plan?</h3>

        <div className="text-sm text-muted-foreground space-y-3 mb-6">
          {daysLeft > 0 && periodEndLabel && (
            <p className="text-foreground font-medium">
              You still have {daysLeft} {daysLeft === 1 ? 'day' : 'days'} paid for, until{' '}
              {periodEndLabel}. Cancelling ends your plan now and does not refund or hold
              that time.
            </p>
          )}
          <p>
            Your workspace drops to the Free plan immediately. Team members lose access,
            and Pro and Business features stop working.
          </p>
          <p>
            <strong className="text-foreground">You will need to purchase again to come back.</strong>{' '}
            That means submitting a new payment and waiting for our team to approve it — it is
            not instant, so you will be on Free in the meantime.
          </p>
          <p>
            Nothing is deleted. Your clients, projects, invoices and files stay exactly as they
            are and become available again the moment a new plan is approved.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            Keep my plan
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Cancelling…
              </>
            ) : (
              <>Yes, cancel my plan</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
