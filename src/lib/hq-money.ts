/**
 * Formatting for Cutline's own money in HQ.
 *
 * Distinct from a tenant's currency (Business.defaultCurrency), which is what
 * they bill their clients in. This is what Cutline is paid in, and it was
 * previously a hardcoded ৳ repeated across the dashboard, finances page and
 * subscription tables — so changing it meant finding five places.
 */

/** Fallback when no settings row exists. Matches the schema default. */
export const DEFAULT_HQ_CURRENCY = 'BDT'

/**
 * Formats a whole-unit amount. Intl gives the right symbol and grouping for
 * whatever code is configured, and falls back to prefixing the raw code if the
 * code is not one Intl recognises, rather than throwing inside a render.
 */
export function formatHqMoney(amount: number, currencyCode = DEFAULT_HQ_CURRENCY): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`
  }
}
