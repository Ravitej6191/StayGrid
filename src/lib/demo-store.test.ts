import { describe, expect, it } from 'vitest'
import { computeMonthlyRentStatus, type DemoPayment } from './demo-store'

function payment(overrides: Partial<DemoPayment>): DemoPayment {
  return {
    id: crypto.randomUUID(),
    tenantId: 't1',
    amount: 0,
    paymentDate: '2026-07-05',
    paymentMode: 'cash',
    forMonth: '2026-07-01',
    status: 'pending',
    receiptNumber: null,
    receiptUrl: null,
    notes: null,
    createdAt: '2026-07-05T00:00:00.000Z',
    ...overrides,
  }
}

describe('computeMonthlyRentStatus', () => {
  it('is pending when no payments exist for the month', () => {
    expect(computeMonthlyRentStatus([], 't1', '2026-07-01', 10000)).toBe('pending')
  })

  it('is partial when the sum of payments is less than rent', () => {
    const payments = [payment({ amount: 4000 })]
    expect(computeMonthlyRentStatus(payments, 't1', '2026-07-01', 10000)).toBe('partial')
  })

  it('sums multiple installment payments for the same month (cumulative, not just the latest)', () => {
    const payments = [payment({ amount: 4000 }), payment({ amount: 6000 })]
    expect(computeMonthlyRentStatus(payments, 't1', '2026-07-01', 10000)).toBe('paid')
  })

  it('is paid when a single payment covers or exceeds rent', () => {
    const payments = [payment({ amount: 12000 })]
    expect(computeMonthlyRentStatus(payments, 't1', '2026-07-01', 10000)).toBe('paid')
  })

  it('ignores payments for a different tenant', () => {
    const payments = [payment({ tenantId: 'other-tenant', amount: 10000 })]
    expect(computeMonthlyRentStatus(payments, 't1', '2026-07-01', 10000)).toBe('pending')
  })

  it('ignores payments for a different month', () => {
    const payments = [payment({ forMonth: '2026-06-01', amount: 10000 })]
    expect(computeMonthlyRentStatus(payments, 't1', '2026-07-01', 10000)).toBe('pending')
  })
})
