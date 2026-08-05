import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/modules/core/db/prisma'
import { getActivePlan, restorablePlan, PLANS, PLAN_PRICES, getPlanFeatures } from '@/lib/subscription'
import { downgradeToPro, restoreBusinessPlan } from './actions'
import { Check, X } from 'lucide-react'
import Link from 'next/link'
import { UpgradeContactModal } from './components/UpgradeContactModal'
import { CancelPlanModal } from './components/CancelPlanModal'

export const metadata = {
  title: 'Billing & Plans',
}

export default async function BillingPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/dashboard/select-business')

  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { subscriptionPlan: true, purchasedPlan: true, subscriptionPeriodEnd: true, customProjectLimit: true }
  })

  if (!business) redirect('/dashboard/select-business')

  const activePlan = getActivePlan(business)
  
  const settings = await prisma.globalSettings.findUnique({ where: { id: 'default' } });
  const features = getPlanFeatures(settings || undefined);
  
  // Override the visual limit if this business has a custom admin-granted limit
  if (business.customProjectLimit !== null) {
    features[activePlan][0].name = `Up to ${business.customProjectLimit} Active Projects (Custom)`;
  }

  // Computed here rather than in the modal: reading the clock during a client
  // render is impure and would let server and client disagree about the days
  // remaining. This is a server component, so it resolves once per request.
  const periodEnd = business.subscriptionPeriodEnd;
  const daysLeft = periodEnd
    ? Math.max(0, Math.ceil((periodEnd.getTime() - new Date().getTime()) / 86_400_000))
    : 0;
  const periodEndLabel = periodEnd?.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Shared with restoreBusinessPlan so the button and the action always agree.
  // These were previously two separate inferences over request history and they
  // drifted: the page offered a restore the action then refused.
  const restorable = restorablePlan(business);
  const canRestoreBusiness = restorable === PLANS.BUSINESS;

  // Check UpgradeRequest
  const lastUpgradeRequest = await prisma.upgradeRequest.findFirst({
    where: {
      businessId: orgId,
    },
    orderBy: { createdAt: 'desc' }
  });

  const isUpgradePending = lastUpgradeRequest?.status === 'PENDING';
  const isUpgradeApproved = lastUpgradeRequest?.status === 'APPROVED';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[PLANS.FREE, PLANS.PRO, PLANS.BUSINESS].map((plan) => {
        const isActive = activePlan === plan;
        const isDowngrade = plan === PLANS.FREE && activePlan !== PLANS.FREE;
        const isDowngradeToPro = plan === PLANS.PRO && activePlan === PLANS.BUSINESS;
        const isRestoreBusiness = plan === PLANS.BUSINESS && canRestoreBusiness;
        
        return (
          <div key={plan} className={`flex flex-col p-6 rounded-2xl border ${isActive ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-zinc-200 dark:border-zinc-800'} bg-white dark:bg-zinc-950`}>
            <div className="mb-4">
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white capitalize">{plan.toLowerCase()}</h4>
              <div className="mt-2 flex items-baseline gap-x-2">
                <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">৳{PLAN_PRICES[plan as keyof typeof PLAN_PRICES]}</span>
                <span className="text-sm font-semibold leading-6 text-zinc-500">/month</span>
              </div>
            </div>
            
            <ul className="mt-8 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400 flex-1">
              {features[plan as keyof typeof features].map((feature) => (
                <li key={feature.name} className="flex gap-x-3">
                  {feature.included ? (
                    <Check className="h-6 w-5 flex-none text-indigo-600" aria-hidden="true" />
                  ) : (
                    <X className="h-6 w-5 flex-none text-zinc-400" aria-hidden="true" />
                  )}
                  <span className={feature.included ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}>{feature.name}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-8">
              {isActive ? (
                <button disabled className="w-full rounded-md bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-900 cursor-not-allowed">
                  Current Plan
                </button>
              ) : isDowngrade ? (
                <CancelPlanModal
                  planName={activePlan.charAt(0) + activePlan.slice(1).toLowerCase()}
                  daysLeft={daysLeft}
                  periodEndLabel={periodEndLabel}
                />
              ) : isDowngradeToPro ? (
                <form action={downgradeToPro}>
                  <button type="submit" className="block w-full rounded-md bg-orange-50 dark:bg-orange-950/30 px-3 py-2 text-center text-sm font-semibold text-orange-600 dark:text-orange-400 shadow-sm hover:bg-orange-100 dark:hover:bg-orange-900/50 ring-1 ring-inset ring-orange-200 dark:ring-orange-900 transition-colors">
                    Downgrade to Pro
                  </button>
                </form>
              ) : isRestoreBusiness ? (
                <form action={restoreBusinessPlan}>
                  <button type="submit" className="block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors">
                    Restore Business Plan
                  </button>
                </form>
              ) : plan === PLANS.BUSINESS ? (
                isUpgradeApproved ? (
                  <Link href={`/dashboard/settings/billing/checkout?plan=${plan}`} className="block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors">
                    Make Payment
                  </Link>
                ) : (
                  <UpgradeContactModal isUpgradePending={isUpgradePending} />
                )
              ) : (
                <Link href={`/dashboard/settings/billing/checkout?plan=${plan}`} className="block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors">
                  Upgrade to {plan.charAt(0) + plan.slice(1).toLowerCase()}
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
