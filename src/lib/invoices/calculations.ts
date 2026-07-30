import { InvoiceStatus } from '@prisma/client'

/**
 * Calculates the tax amount for an invoice.
 * Current behavior: Multiplies subtotal by taxRateBps and rounds half up.
 * 
 * @param subtotalCents Total cents of all line items
 * @param taxRateBps Tax rate in basis points (e.g. 2000 = 20%)
 * @returns Tax amount in cents
 */
export function calculateTaxAmount(subtotalCents: number, taxRateBps: number): number {
  return Math.round(subtotalCents * (taxRateBps / 10000))
}

/**
 * Calculates the total invoice amount.
 * 
 * @param subtotalCents Total cents of all line items
 * @param taxAmountCents Tax amount in cents
 * @returns Total amount in cents
 */
export function calculateInvoiceTotal(subtotalCents: number, taxAmountCents: number): number {
  return subtotalCents + taxAmountCents
}

/**
 * Determines the new invoice status when a payment is recorded or amounts change.
 * - Terminal states (VOID, CREDIT_NOTE, DRAFT) remain unchanged by payments.
 * - OVERDUE transitions to PARTIALLY_PAID if unpaid balance remains, or PAID if 0 due.
 * 
 * @param currentStatus The current status of the invoice
 * @param newDueCents The newly calculated amount due in cents
 * @param newPaidCents The total amount paid in cents
 * @returns The new invoice status
 */
export function calculateInvoiceStatus(
  currentStatus: InvoiceStatus,
  newDueCents: number,
  newPaidCents: number
): InvoiceStatus {
  // Terminal states do not transition based on payment application
  if (currentStatus === 'VOID' || currentStatus === 'CREDIT_NOTE' || currentStatus === 'DRAFT') {
    return currentStatus
  }

  if (newDueCents <= 0) {
    return 'PAID'
  }

  if (newPaidCents > 0) {
    return 'PARTIALLY_PAID'
  }

  // If there's still balance due and nothing paid, it stays whatever it was (SENT or OVERDUE)
  return currentStatus
}
