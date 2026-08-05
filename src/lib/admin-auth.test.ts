import { describe, it, expect } from 'vitest'
import { clampSetting, MAX_FAILED_LOGINS, SESSION_TIMEOUT_MINUTES } from './admin-auth'

describe('clampSetting', () => {
  it('passes an in-range value through', () => {
    expect(clampSetting(3, MAX_FAILED_LOGINS)).toBe(3)
    expect(clampSetting(30, SESSION_TIMEOUT_MINUTES)).toBe(30)
  })

  it('raises a negative to the minimum', () => {
    // The dangerous case: with a negative threshold, attempts >= threshold is
    // true on the first failure, locking an admin out on one typo.
    expect(clampSetting(-1, MAX_FAILED_LOGINS)).toBe(1)
    expect(clampSetting(-999, MAX_FAILED_LOGINS)).toBe(1)
  })

  it('raises zero to the minimum instead of treating it as unset', () => {
    // `value || fallback` turned a configured 0 into 5, so the panel showed one
    // number while the system used another.
    expect(clampSetting(0, MAX_FAILED_LOGINS)).toBe(1)
    expect(clampSetting(0, SESSION_TIMEOUT_MINUTES)).toBe(1)
  })

  it('caps an absurd value', () => {
    expect(clampSetting(1_000_000, MAX_FAILED_LOGINS)).toBe(50)
    expect(clampSetting(1_000_000, SESSION_TIMEOUT_MINUTES)).toBe(1440)
  })

  it('falls back when the value is missing or not a number', () => {
    expect(clampSetting(null, MAX_FAILED_LOGINS)).toBe(5)
    expect(clampSetting(undefined, MAX_FAILED_LOGINS)).toBe(5)
    expect(clampSetting(NaN, MAX_FAILED_LOGINS)).toBe(5)
    expect(clampSetting(Infinity, SESSION_TIMEOUT_MINUTES)).toBe(15)
  })

  it('truncates a fractional value', () => {
    expect(clampSetting(3.9, MAX_FAILED_LOGINS)).toBe(3)
  })
})
