import { describe, expect, it } from 'vitest'
import { digitsOnly, formatCurrency, monthKey, monthKeyOfDateString } from './format'

describe('monthKey', () => {
  it('formats a local date as YYYY-MM', () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe('2026-01')
    expect(monthKey(new Date(2026, 11, 1))).toBe('2026-12')
  })

  it('pads single-digit months', () => {
    expect(monthKey(new Date(2026, 2, 1))).toBe('2026-03')
  })
})

describe('monthKeyOfDateString', () => {
  it('matches monthKey for the equivalent local date', () => {
    expect(monthKeyOfDateString('2026-07-19')).toBe('2026-07')
  })

  it('is a pure string slice (no timezone shifting)', () => {
    expect(monthKeyOfDateString('2026-01-01')).toBe('2026-01')
  })
})

describe('digitsOnly', () => {
  it('strips non-digit characters', () => {
    expect(digitsOnly('987-65 43210', 10)).toBe('9876543210')
  })

  it('truncates to maxLength', () => {
    expect(digitsOnly('123456789012', 10)).toBe('1234567890')
  })

  it('handles empty input', () => {
    expect(digitsOnly('', 10)).toBe('')
  })
})

describe('formatCurrency', () => {
  it('formats whole rupee amounts with no decimals', () => {
    expect(formatCurrency(1500)).toBe('₹1,500')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0')
  })
})
