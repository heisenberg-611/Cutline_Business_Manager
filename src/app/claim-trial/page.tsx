import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/modules/core/db/prisma';
import { PLANS } from '@/lib/subscription';

export default async function ClaimTrialPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect('/sign-up?redirect_url=/claim-trial');
  }

  if (!orgId) {
    redirect('/dashboard/select-business?redirect_url=/claim-trial');
  }

  const business = await prisma.business.findUnique({
    where: { id: orgId }
  });

  // Only grant if they are currently on FREE and haven't active plan
  if (business && business.subscriptionPlan === PLANS.FREE) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    await prisma.business.update({
      where: { id: orgId },
      data: {
        subscriptionPlan: PLANS.PRO,
        subscriptionPeriodEnd: thirtyDaysFromNow
      }
    });
  }

  // Add a query param to show a success toast on dashboard (if implemented)
  redirect('/dashboard?trial_activated=true');
}
