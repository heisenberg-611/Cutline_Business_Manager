import type { SubscriptionPlan } from "@prisma/client";

export const PLANS = {
  FREE: "FREE" as SubscriptionPlan,
  PRO: "PRO" as SubscriptionPlan,
  BUSINESS: "BUSINESS" as SubscriptionPlan,
};

// Plan Prices (in BDT)
export const PLAN_PRICES = {
  FREE: 0,
  PRO: 99,
  BUSINESS: 299,
};

export const PLAN_FEATURES = {
  [PLANS.FREE]: [
    { name: 'Dashboard & Analytics', included: true },
    { name: 'Client & Project Management', included: true },
    { name: 'Financial Tracking', included: true },
    { name: 'Asset Management', included: true },
    { name: 'Email Invoices Directly', included: false },
    { name: 'Client Feedback Forms', included: false },
    { name: 'Access to ProdP', included: false },
    { name: 'Team Member Invites', included: false },
    { name: 'Team Collaboration', included: false },
    { name: 'Realtime Messages', included: false },
  ],
  [PLANS.PRO]: [
    { name: 'Dashboard & Analytics', included: true },
    { name: 'Client & Project Management', included: true },
    { name: 'Financial Tracking', included: true },
    { name: 'Asset Management', included: true },
    { name: 'Email Invoices Directly', included: true },
    { name: 'Client Feedback Forms', included: true },
    { name: 'Access to ProdP', included: true },
    { name: 'Team Member Invites', included: false },
    { name: 'Team Collaboration', included: false },
    { name: 'Realtime Messages', included: false },
  ],
  [PLANS.BUSINESS]: [
    { name: 'Dashboard & Analytics', included: true },
    { name: 'Client & Project Management', included: true },
    { name: 'Financial Tracking', included: true },
    { name: 'Asset Management', included: true },
    { name: 'Email Invoices Directly', included: true },
    { name: 'Client Feedback Forms', included: true },
    { name: 'Access to ProdP', included: true },
    { name: 'Team Member Invites', included: true },
    { name: 'Team Collaboration', included: true },
    { name: 'Realtime Messages', included: true },
  ]
};

export function getPlanFeatures(settings?: { freeTierProjectLimit?: number | null, proTierProjectLimit?: number | null }) {
  const freeLimit = settings?.freeTierProjectLimit ?? 3;
  const proLimit = settings?.proTierProjectLimit ?? 20;

  return {
    [PLANS.FREE]: [
      { name: `Up to ${freeLimit} Active Projects`, included: true },
      ...PLAN_FEATURES[PLANS.FREE].filter(f => f.name !== 'Client & Project Management')
    ],
    [PLANS.PRO]: [
      { name: `Up to ${proLimit} Active Projects`, included: true },
      ...PLAN_FEATURES[PLANS.PRO].filter(f => f.name !== 'Client & Project Management')
    ],
    [PLANS.BUSINESS]: [
      { name: 'Unlimited Active Projects', included: true },
      ...PLAN_FEATURES[PLANS.BUSINESS].filter(f => f.name !== 'Client & Project Management')
    ]
  };
}



export function isSubscriptionActive(business: { subscriptionPlan: SubscriptionPlan; subscriptionPeriodEnd: Date | null }) {
  if (business.subscriptionPlan === PLANS.FREE) return true;
  if (!business.subscriptionPeriodEnd) return true; // Admin override: no expiry = indefinite access
  return new Date() < business.subscriptionPeriodEnd;
}

export function getActivePlan(business: { subscriptionPlan: SubscriptionPlan; subscriptionPeriodEnd: Date | null }): SubscriptionPlan {
  if (isSubscriptionActive(business)) {
    return business.subscriptionPlan;
  }
  return PLANS.FREE; // Fallback to free if expired
}

// -----------------------------------------------------------------------------
// FEATURE GATING LOGIC
// -----------------------------------------------------------------------------

export function canSendEmails(plan: SubscriptionPlan) {
  return plan === PLANS.PRO || plan === PLANS.BUSINESS;
}

export function canUseFeedback(plan: SubscriptionPlan) {
  return plan === PLANS.PRO || plan === PLANS.BUSINESS;
}

export function canAccessProdP(plan: SubscriptionPlan) {
  return plan === PLANS.PRO || plan === PLANS.BUSINESS;
}

export function canInviteMembers(plan: SubscriptionPlan) {
  return plan === PLANS.BUSINESS;
}

export function canUseMessages(plan: SubscriptionPlan) {
  return plan === PLANS.BUSINESS;
}

/**
 * Team collaboration: project members, tasks, comments and @mentions.
 *
 * Checked explicitly rather than inferred from canInviteMembers. A business
 * downgraded from BUSINESS keeps its Clerk organization members, so relying on
 * "they have teammates" would leave collaboration switched on after downgrade.
 */
export function canUseTeamCollaboration(plan: SubscriptionPlan) {
  return plan === PLANS.BUSINESS;
}
