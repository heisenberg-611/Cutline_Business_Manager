import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/modules/core/db/prisma';
import { canAccessProdP, getActivePlan } from '@/lib/subscription';
import { PlanLockedScreen } from '@/modules/core/ui/PlanLockedScreen';

export default async function ProdPLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = await auth();
  if (!orgId) redirect('/dashboard/select-business');

  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { subscriptionPlan: true, subscriptionPeriodEnd: true }
  });

  if (!business) redirect('/dashboard/select-business');

  if (!canAccessProdP(getActivePlan(business))) {
    return (
      <PlanLockedScreen
        tier="Pro"
        description="The ProdP feature is available on the Pro and Business plans. Upgrade your subscription to unlock it."
      />
    );
  }

  return <>{children}</>;
}
