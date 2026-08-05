import { describe, it, expect } from 'vitest'
import { formatHqMoney, currencySymbol, compactNumber, HQ_CURRENCIES, DEFAULT_HQ_CURRENCY } from './hq-money'

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

describe('compactNumber', () => {
  it('keeps axis ticks short', () => {
    // The y-axis was unreadable because every tick carried a full formatted
    // amount. Short ticks are what let the axis fit at all.
    expect(compactNumber(0)).toBe('0')
    expect(compactNumber(300)).toBe('300')
    expect(compactNumber(1200)).toBe('1.2K')
    expect(compactNumber(2988)).toBe('3K')
    expect(compactNumber(1_500_000)).toBe('1.5M')
  })

  it('never produces a tick long enough to clip', () => {
    // Six characters is what the reserved 44px axis width comfortably holds.
    for (const v of [0, 99, 999, 2988, 45_000, 1_200_000]) {
      expect(compactNumber(v).length).toBeLessThanOrEqual(6)
    }
  })

  it('carries no currency, since the unit is stated once on the axis', () => {
    expect(compactNumber(2988)).not.toMatch(/[৳$€£₹]|BDT|USD/)
  })
})

describe('HQ_CURRENCIES', () => {
  it('no two offered currencies format identically', () => {
    // The real risk is ambiguity, not a missing symbol. AUD, CAD and SGD all
    // render as a bare "$" under narrowSymbol, so picking one would silently
    // relabel every figure in HQ as dollars. This is what keeps them out.
    const rendered = HQ_CURRENCIES.map((c) => formatHqMoney(1000, c.code))
    expect(new Set(rendered).size).toBe(HQ_CURRENCIES.length)
  })

  it('every offered code renders the amount readably', () => {
    for (const { code } of HQ_CURRENCIES) {
      expect(formatHqMoney(1000, code)).toContain('1,000')
    }
  })

  it('includes the default', () => {
    expect(HQ_CURRENCIES.some((c) => c.code === DEFAULT_HQ_CURRENCY)).toBe(true)
  })
})
