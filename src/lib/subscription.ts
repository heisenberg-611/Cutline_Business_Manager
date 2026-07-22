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
    { name: 'Realtime Messages', included: true },
  ]
};



export function isSubscriptionActive(business: { subscriptionPlan: SubscriptionPlan; subscriptionPeriodEnd: Date | null }) {
  if (business.subscriptionPlan === PLANS.FREE) return true;
  if (!business.subscriptionPeriodEnd) return false;
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
