import { describe, it, expect } from 'vitest'

/**
 * Mirrors csvCell in ./route.ts. Kept in step by the cases below rather than
 * imported, because the route module pulls in Prisma and next/server.
 */
function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value)
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}

describe('audit CSV escaping', () => {
  it('neutralises formulas, which quoting alone does not', () => {
    // Excel and Sheets evaluate these even inside quotes.
    for (const payload of [
      '=1+1',
      '=HYPERLINK("http://evil.test","click")',
      '+1234',
      '-1+2',
      '@SUM(A1)',
      '=cmd|\'/c calc\'!A1',
    ]) {
      const cell = csvCell(payload)
      expect(cell.startsWith('"\'')).toBe(true)
    }
  })

  it('leaves ordinary values alone', () => {
    expect(csvCell('admin@test.local')).toBe('"admin@test.local"')
    expect(csvCell('FORCE_UPDATE_SUBSCRIPTION')).toBe('"FORCE_UPDATE_SUBSCRIPTION"')
    expect(csvCell('2026-08-05 10:00:00')).toBe('"2026-08-05 10:00:00"')
  })

  it('escapes embedded quotes so a cell cannot break out', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    // A crafted value must not terminate the field and inject new columns.
    expect(csvCell('a","=1+1')).toBe('"a"",""=1+1"')
  })

  it('handles null and undefined', () => {
    expect(csvCell(null)).toBe('""')
    expect(csvCell(undefined)).toBe('""')
  })

  it('neutralises leading tab and carriage return', () => {
    // Both are alternative formula-injection lead-ins.
    expect(csvCell('\t=1+1').startsWith('"\'')).toBe(true)
    expect(csvCell('\r=1+1').startsWith('"\'')).toBe(true)
  })
})
