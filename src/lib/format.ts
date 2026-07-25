/**
 * Canonical formatting utilities for the Cutline application.
 */

/**
 * Formats a monetary value stored in cents into a localized currency string.
 * This is the primary formatter, as the Prisma schema stores all money in cents.
 */
// in: integer cents
export function formatMoney(cents: number | null | undefined, currency = 'USD'): string {
  if (cents == null || isNaN(cents)) return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(cents / 100);
}

/**
 * Formats a monetary value into a compact notation (e.g., $1K) for charts.
 * Takes cents as input to remain consistent with the canonical unit.
 */
// in: integer cents
export function formatMoneyCompact(cents: number | null | undefined, currency = 'USD'): string {
  if (cents == null || isNaN(cents)) return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact' }).format(0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

/**
 * Formats a raw dollar amount. Use this ONLY when dealing with user input (like a currency converter)
 * or a 3rd-party API that provides pre-converted dollars. For all internal DB values, use formatMoney(cents).
 */
// in: dollars
export function formatDollars(dollars: number | null | undefined, currency = 'USD'): string {
  if (dollars == null || isNaN(dollars)) return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(dollars);
}

/**
 * Same as formatDollars, but with compact notation (e.g., "$1K" instead of "$1,000.00").
 */
// in: dollars
export function formatDollarsCompact(dollars: number | null | undefined, currency = 'USD'): string {
  if (dollars == null || isNaN(dollars)) return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact' }).format(0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(dollars);
}

/**
 * Formats a monetary value into a plain decimal string (e.g. "10.50") without currency symbols or commas.
 * Useful for CSV exports or numeric inputs.
 */
// in: integer cents
export function formatDecimal(cents: number | null | undefined): string {
  if (cents == null || isNaN(cents)) return '0.00';
  return (cents / 100).toFixed(2);
}

/**
 * Formats a Date object or ISO string into a standard localized date.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats a Date object or ISO string into a standard localized date and time.
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}
