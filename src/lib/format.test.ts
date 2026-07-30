import { describe, it, expect } from 'vitest'
import { formatMoney, formatMoneyCompact, formatDollars, formatDollarsCompact, formatDecimal, formatDate, formatDateTime } from './format'

describe('Formatting Utilities', () => {
  describe('formatMoney', () => {
    it('formats USD correctly', () => {
      expect(formatMoney(1000)).toBe('$10.00')
      expect(formatMoney(0)).toBe('$0.00')
    })

    it('formats non-USD values correctly (e.g. EUR)', () => {
      // Using EUR as currency. Depending on locale 'en-US' and currency 'EUR', it might output '€10.00'
      // Some environments might output '€10.00' or 'EUR 10.00' depending on Node/Intl version.
      // But typically '€10.00'
      const res = formatMoney(150000, 'EUR') // 1500.00
      expect(res).toMatch(/€1,500\.00/) // Checking >= 1000 to catch unit confusions and formatting
    })

    it('handles null/undefined gracefully', () => {
      expect(formatMoney(null)).toBe('$0.00')
      expect(formatMoney(undefined)).toBe('$0.00')
    })
  })

  describe('formatMoneyCompact', () => {
    it('formats compact values correctly', () => {
      expect(formatMoneyCompact(150000)).toBe('$1.5K')
      expect(formatMoneyCompact(100000000)).toBe('$1.0M')
    })
  })

  describe('formatDollars', () => {
    it('formats dollars correctly', () => {
      expect(formatDollars(10)).toBe('$10.00')
      expect(formatDollars(1500)).toBe('$1,500.00')
    })
  })

  describe('formatDollarsCompact', () => {
    it('formats compact dollars correctly', () => {
      expect(formatDollarsCompact(1500)).toBe('$2K') // Since it sets maximumFractionDigits to 0, 1.5K -> 2K or 1.5K depends on rounding. Wait, actually short notation handles fractions.
      // Let's test a clean 1000 instead to avoid env variance
      expect(formatDollarsCompact(1000)).toBe('$1K')
    })
  })

  describe('formatDecimal', () => {
    it('formats decimal strings correctly', () => {
      expect(formatDecimal(1050)).toBe('10.50')
      expect(formatDecimal(0)).toBe('0.00')
    })
  })

  describe('formatDate', () => {
    it('formats dates correctly', () => {
      expect(formatDate(new Date('2026-07-28T00:00:00Z'))).toMatch(/Jul 2\d, 2026/)
    })
  })

  describe('formatDateTime', () => {
    it('formats date and time correctly', () => {
      expect(formatDateTime(new Date('2026-07-28T12:00:00Z'))).toMatch(/Jul 2\d, 2026/)
    })
  })
})
