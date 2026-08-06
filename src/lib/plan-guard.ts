import { cache } from 'react'
import type { SubscriptionPlan } from '@prisma/client'
import prisma from '@/modules/core/db/prisma'
import {
  PLANS,
  getActivePlan,
  canAccessProdP,
  canInviteMembers,
  canSendEmails,
  canUseFeedback,
  canUseMessages,
  canUseTeamCollaboration,
} from '@/lib/subscription'

/**
 * Server-side feature gating.
 *
 * Layouts and pages gate what gets *rendered*; they do not run before a Server
 * Action executes, and action ids ship in publicly served client chunks. So
 * every paid mutation has to ask here, on the server, regardless of what the
 * UI already hid.
 */

export type PlanFeature =
  | 'emails'
  | 'feedback'
  | 'prodp'
  | 'members'
  | 'messages'
  | 'collaboration'

/**
 * One entry per gated feature: the predicate from lib/subscription (the single
 * source of truth for which tier unlocks what) plus the copy shown when it is
 * refused. Keeping the message here means a locked action and a locked screen
 * describe the feature the same way.
 */
const FEATURES: Record<
  PlanFeature,
  { allows: (plan: SubscriptionPlan) => boolean; message: string }
> = {
  emails: {
    allows: canSendEmails,
    message: 'Emailing invoices is available on the Pro and Business plans.',
  },
  feedback: {
    allows: canUseFeedback,
    message: 'Client feedback forms are available on the Pro and Business plans.',
  },
  prodp: {
    allows: canAccessProdP,
    message: 'ProdP is available on the Pro and Business plans.',
  },
  members: {
    allows: canInviteMembers,
    message: 'Team member invites are available on the Business plan.',
  },
  messages: {
    allows: canUseMessages,
    message: 'Realtime messaging is available on the Business plan.',
  },
  collaboration: {
    allows: canUseTeamCollaboration,
    message: 'Team collaboration is available on the Business plan.',
  },
}

/**
 * Thrown instead of a bare Error so callers and tests can tell "you may not do
 * this on your plan" apart from "this genuinely broke".
 */
export class PlanRequiredError extends Error {
  readonly feature: PlanFeature
  readonly plan: SubscriptionPlan

  constructor(feature: PlanFeature, plan: SubscriptionPlan) {
    super(FEATURES[feature].message)
    this.name = 'PlanRequiredError'
    this.feature = feature
    this.plan = plan
  }
}

/**
 * The plan a business is actually entitled to right now — an expired paid
 * subscription resolves to FREE. Always prefer this over reading the
 * `subscriptionPlan` column directly, which does not account for expiry.
 */
export const getActivePlanFor = cache(
  async (orgId: string): Promise<SubscriptionPlan> => {
    const business = await prisma.business.findUnique({
      where: { id: orgId },
      select: { subscriptionPlan: true, subscriptionPeriodEnd: true },
    })

    // No business row means nothing is provisioned yet; fail closed.
    if (!business) return PLANS.FREE

    return getActivePlan(business)
  }
)

/**
 * Throws unless the business's active plan unlocks `feature`. Call at the top
 * of every gated Server Action, before any side effect.
 */
export async function requirePlan(
  orgId: string,
  feature: PlanFeature
): Promise<SubscriptionPlan> {
  const plan = await getActivePlanFor(orgId)

  if (!FEATURES[feature].allows(plan)) {
    throw new PlanRequiredError(feature, plan)
  }

  return plan
}

/** Clerk's seat limit for a plan. Below Business, only the owner has a seat. */
export async function seatCapFor(plan: SubscriptionPlan): Promise<number> {
  if (!canInviteMembers(plan)) return 1

  // Read rather than hardcoded, because the ceiling is a property of the Clerk
  // instance (which differs between environments) rather than of our pricing —
  // and Clerk rejects a value above what the instance allows.
  const settings = await prisma.globalSettings.findUnique({
    where: { id: 'default' },
    select: { businessTierSeatLimit: true },
  })

  return settings?.businessTierSeatLimit ?? DEFAULT_BUSINESS_SEATS
}

/** Matches the schema default; used when no settings row exists yet. */
const DEFAULT_BUSINESS_SEATS = 25

/**
 * Mirrors the plan onto Clerk's own seat limit, which is the only thing that
 * can refuse an invite: invites are issued browser-to-Clerk and never reach
 * this app, so hiding the button in our UI cannot stop one.
 *
 * Note this caps *new* memberships only — Clerk leaves memberships that already
 * exceed the cap in place, which is why downgrades also need the seat lock in
 * the dashboard layout.
 *
 * Deliberately never throws. It is called from billing and subscription flows,
 * and a Clerk outage must not fail a customer's upgrade or block a
 * cancellation. The webhook backstop re-checks the plan when a membership is
 * actually created, so a missed sync is caught there rather than becoming a
 * silent hole.
 */
export async function syncClerkSeatCap(
  orgId: string,
  plan: SubscriptionPlan
): Promise<void> {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()

    await client.organizations.updateOrganization(orgId, {
      maxAllowedMemberships: await seatCapFor(plan),
    })
  } catch (error) {
    // Value passed as an argument rather than interpolated: console.* runs the
    // first argument through util.format, so an id containing a format
    // specifier could otherwise garble or forge surrounding log entries.
    console.error('[plan-guard] Failed to sync seat cap for %s:', orgId, error)
  }
}
