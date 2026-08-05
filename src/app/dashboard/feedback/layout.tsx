import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/modules/core/db/prisma';
import { canUseFeedback, getActivePlan } from '@/lib/subscription';
import { PlanLockedScreen } from '@/modules/core/ui/PlanLockedScreen';

export default async function FeedbackLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = await auth();
  if (!orgId) redirect('/dashboard/select-business');

  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { subscriptionPlan: true, subscriptionPeriodEnd: true }
  });

  if (!business) redirect('/dashboard/select-business');

  if (!canUseFeedback(getActivePlan(business))) {
    return (
      <PlanLockedScreen
        tier="Pro"
        description="Client Feedback Forms are available on the Pro and Business plans. Upgrade your subscription to start collecting automated feedback and testimonials."
      />
    );
  }

  return <>{children}</>;
}
