import { describe, it, expect } from 'vitest'
import { formatHqMoney, currencySymbol, DEFAULT_HQ_CURRENCY } from './hq-money'

describe('formatHqMoney', () => {
  it('formats the configured currency', () => {
    expect(formatHqMoney(2988, 'BDT')).toContain('2,988')
    expect(formatHqMoney(1000, 'USD')).toContain('1,000')
  })

  it('shows whole units, since amounts are stored that way', () => {
    expect(formatHqMoney(299, 'BDT')).not.toContain('.00')
  })

  it('falls back rather than throwing on an unrecognised code', () => {
    // An operator can type anything into a three-letter field, and a throw
    // inside a server component would take the whole HQ page down.
    const result = formatHqMoney(500, 'ZZZ')
    expect(result).toContain('500')
    expect(result).toContain('ZZZ')
  })

  it('defaults when no code is given', () => {
    expect(DEFAULT_HQ_CURRENCY).toBe('BDT')
    expect(formatHqMoney(100)).toContain('100')
  })

  it('handles zero', () => {
    expect(formatHqMoney(0, 'BDT')).toContain('0')
  })
})

describe('currencySymbol', () => {
  it('gives the narrow symbol, not the bare code', () => {
    // The default currencyDisplay renders BDT as the literal string "BDT",
    // which is why narrowSymbol is used — and why this is asserted.
    expect(currencySymbol('BDT')).toBe('৳')
    expect(currencySymbol('USD')).toBe('$')
    expect(currencySymbol('EUR')).toBe('€')
    expect(currencySymbol('GBP')).toBe('£')
    expect(currencySymbol('INR')).toBe('₹')
  })

  it('returns null rather than the code, so callers can choose a fallback', () => {
    // Rendering "ZZZ" where a symbol belongs would look like a bug; the icon
    // falls back to a neutral banknote instead.
    expect(currencySymbol('ZZZ')).toBeNull()
  })

  it('formats amounts with the symbol and Latin digits', () => {
    expect(formatHqMoney(2988, 'BDT')).toBe('৳2,988')
    expect(formatHqMoney(996, 'USD')).toBe('$996')
  })
})
