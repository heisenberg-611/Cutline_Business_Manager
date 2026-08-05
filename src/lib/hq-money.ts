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
      // narrowSymbol gives ৳ for BDT where the default gives the bare code
      // "BDT", while keeping Latin digits — a bn-BD locale would render Bengali
      // numerals, which is not what the rest of HQ uses.
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`
  }
}

/**
 * The symbol for a currency, e.g. "৳" for BDT or "$" for USD.
 *
 * Pulled out of Intl's own formatting rather than kept as a lookup table, so it
 * stays correct for any code an operator sets without needing this file updated.
 * Returns null when no symbol can be derived, which lets callers choose their
 * own fallback instead of rendering something misleading.
 */
export function currencySymbol(currencyCode = DEFAULT_HQ_CURRENCY): string | null {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).formatToParts(0)

    const symbol = parts.find((p) => p.type === 'currency')?.value
    // Intl falls back to echoing the code itself when it has no symbol; that is
    // not a symbol, and a caller wanting the code can use the code.
    if (!symbol || symbol === currencyCode) return null
    return symbol
  } catch {
    return null
  }
}

/**
 * Currencies offered in HQ, so the setting is a choice rather than free text.
 * Kept short and regional-first; formatting works for any ISO code, so adding one
 * here is a one-line change.
 */
export const HQ_CURRENCIES = [
  { code: 'BDT', label: 'BDT — Bangladeshi Taka' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'AED', label: 'AED — UAE Dirham' },
] as const

// AUD, CAD and SGD are deliberately absent. Under narrowSymbol they all render
// as a bare "$", indistinguishable from USD, so choosing one would silently
// mislabel every figure in HQ. Offering a currency that cannot be told apart is
// worse than not offering it; the exclusion is enforced by a test asserting no
// two entries format alike. Add one only with a disambiguating display.

/**
 * Short number for an axis tick: 1200 -> "1.2K".
 *
 * Deliberately carries no currency. A full "৳1,200" on every tick is what made
 * the y-axis unreadable and clipped — the unit belongs on the axis once, not on
 * each label.
 */
export function compactNumber(value: number): string {
  try {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return String(value)
  }
}
