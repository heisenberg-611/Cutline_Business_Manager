import { describe, it, expect } from 'vitest'
import { calculateTaxAmount, calculateInvoiceTotal, calculateInvoiceStatus } from './calculations'

describe('Invoice Calculations', () => {
  describe('calculateTaxAmount', () => {
    it('returns 0 when taxRateBps is 0', () => {
      expect(calculateTaxAmount(1000, 0)).toBe(0)
    })

    it('returns 0 when subtotalCents is 0', () => {
      expect(calculateTaxAmount(0, 2000)).toBe(0)
    })

    it('calculates tax accurately and rounds half up', () => {
      // 1000 cents * (1500 bps / 10000) = 1000 * 0.15 = 150 cents
      expect(calculateTaxAmount(1000, 1500)).toBe(150)
      
      // 1005 cents * 0.15 = 150.75 -> rounds up to 151
      expect(calculateTaxAmount(1005, 1500)).toBe(151)

      // 1003 cents * 0.15 = 150.45 -> rounds down to 150
      expect(calculateTaxAmount(1003, 1500)).toBe(150)
      
      // 1003.33 cents * 0.15 = 150.4995 (Wait, we only have integer cents, so subtotal is always integer)
      // 3 cents * 0.15 = 0.45 -> rounds down to 0
      expect(calculateTaxAmount(3, 1500)).toBe(0)

      // Exact half rounding up
      // 100 cents * 0.085 (850 bps) = 8.5 -> rounds up to 9
      expect(calculateTaxAmount(100, 850)).toBe(9)
    })
  })

  describe('calculateInvoiceTotal', () => {
    it('sums subtotal and tax amount', () => {
      expect(calculateInvoiceTotal(1000, 150)).toBe(1150)
    })
  })

  describe('calculateInvoiceStatus', () => {
    it('preserves terminal states regardless of payment amounts', () => {
      expect(calculateInvoiceStatus('VOID', 0, 100)).toBe('VOID')
      expect(calculateInvoiceStatus('CREDIT_NOTE', 0, 100)).toBe('CREDIT_NOTE')
      expect(calculateInvoiceStatus('DRAFT', 500, 0)).toBe('DRAFT')
    })

    it('transitions to PAID when due is 0 or less', () => {
      expect(calculateInvoiceStatus('SENT', 0, 1000)).toBe('PAID')
      expect(calculateInvoiceStatus('PARTIALLY_PAID', 0, 1000)).toBe('PAID')
      expect(calculateInvoiceStatus('OVERDUE', 0, 1000)).toBe('PAID')
      
      // Overpayment case
      expect(calculateInvoiceStatus('SENT', -100, 1100)).toBe('PAID')
    })

    it('transitions to PARTIALLY_PAID when due > 0 and paid > 0', () => {
      expect(calculateInvoiceStatus('SENT', 500, 500)).toBe('PARTIALLY_PAID')
      expect(calculateInvoiceStatus('OVERDUE', 500, 500)).toBe('PARTIALLY_PAID') // Based on logic, a partial payment against OVERDUE resets it to PARTIALLY_PAID (or stays OVERDUE? Our logic says PARTIALLY_PAID)
    })

    it('maintains non-terminal states when no payment is made', () => {
      expect(calculateInvoiceStatus('SENT', 1000, 0)).toBe('SENT')
      expect(calculateInvoiceStatus('OVERDUE', 1000, 0)).toBe('OVERDUE')
    })
  })
})
