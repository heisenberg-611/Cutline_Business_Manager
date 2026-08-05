import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/modules/core/db/prisma';
import { PLANS } from '@/lib/subscription';
import { claimFreeTrial } from './actions';
import { Button } from '@/components/ui/button';

/**
 * Read-only. The grant itself lives in ./actions.ts behind the button below —
 * see the note there on why this must not happen during a GET render.
 */
export default async function ClaimTrialPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect('/sign-up?redirect_url=/claim-trial');
  }

  if (!orgId) {
    redirect('/dashboard/select-business?redirect_url=/claim-trial');
  }

  const [business, user, settings] = await Promise.all([
    prisma.business.findUnique({
      where: { id: orgId },
      select: { name: true, subscriptionPlan: true, hasUsedFreeTrial: true }
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { hasUsedFreeTrial: true } }),
    prisma.globalSettings.findUnique({ where: { id: 'default' } })
  ]);

  if (!user || !business) {
    redirect('/dashboard?error=trial_unavailable');
  }

  if (user.hasUsedFreeTrial || business.hasUsedFreeTrial) {
    redirect('/dashboard?error=trial_already_used');
  }

  if (business.subscriptionPlan !== PLANS.FREE) {
    redirect('/dashboard?error=trial_unavailable');
  }

  const trialDays = settings?.defaultTrialDays || 30;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
        Start your {trialDays}-day Pro trial
      </h1>
      <p className="text-zinc-500 max-w-md mb-8">
        {business.name} gets full Pro access for {trialDays} days — email invoices
        directly, collect client feedback, and unlock ProdP. No card required, and
        it converts to Free automatically when the trial ends.
      </p>
      <form action={claimFreeTrial}>
        <Button type="submit" size="lg">
          Activate Pro trial
        </Button>
      </form>
      <p className="text-xs text-zinc-400 mt-4">
        One trial per workspace.
      </p>
    </div>
  );
}
