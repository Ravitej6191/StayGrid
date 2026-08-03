import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DemoPayment } from './demo-store'

// vitest's default test environment is plain Node, with no `window`/
// `localStorage` global — demo-store.ts is written for the browser and
// reads/writes through those directly. A minimal in-memory polyfill lets the
// mutators below run as real integration tests (seed → add room → allot
// tenant → record payment) instead of only unit-testing the pure helper.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  setItem(key: string, value: string) {
    this.store.set(key, value)
  }
}

vi.stubGlobal('window', globalThis)
vi.stubGlobal('localStorage', new MemoryStorage())

const {
  addFloor,
  addRoom,
  addTenant,
  clearDemoDb,
  computeMonthlyRentStatus,
  getDemoDb,
  reassignTenant,
  recordDeposit,
  recordPayment,
  seedFromOnboarding,
  unassignTenant,
  vacateTenant,
} = await import('./demo-store')

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

/** Seeds a fresh demo building with one floor, one twin-sharing room (2
 * beds), and one active tenant allotted to the first bed — the baseline
 * every mutator test below builds on. */
function seedTenantInRoom(rent: number, deposit: number) {
  seedFromOnboarding({
    propertyType: 'pg',
    buildingName: 'Test PG',
    address: '', city: '', state: '', pincode: '',
    ownerName: 'Owner', phone: '', gstNumber: null, panNumber: null,
  })
  const floor = addFloor({ name: 'Ground Floor', floorNumber: 0 })
  const { beds } = addRoom({ floorId: floor.id, roomNumber: 'G1', roomType: 'twin', capacity: 2 })
  const tenant = addTenant({
    bedId: beds[0]!.id,
    name: 'Test Tenant', phone: '9876543210', email: null, aadhaarNumber: null,
    emergencyContactName: null, emergencyContactPhone: null, bloodGroup: null,
    occupation: null, company: null, photoUrl: null, rent, deposit,
  })
  return { beds, tenant }
}

describe('recordPayment (money-critical: rent status + receipts)', () => {
  beforeEach(() => clearDemoDb())

  it('marks the current month paid when a payment covers the full rent', () => {
    const { tenant } = seedTenantInRoom(10000, 20000)
    const forMonth = `${new Date().toISOString().slice(0, 7)}-01`
    recordPayment({ tenantId: tenant.id, amount: 10000, paymentMode: 'cash', paymentDate: '2026-07-05', forMonth, notes: null, receiptUrl: null })

    const db = getDemoDb()
    expect(db.tenants.find((t) => t.id === tenant.id)?.rentStatus).toBe('paid')
    expect(db.payments).toHaveLength(1)
    expect(db.payments[0]!.receiptNumber).toBe('RCPT-0001')
    expect(db.payments[0]!.createdAt).toBeTruthy()
  })

  it('marks the month partial when a payment covers less than the rent', () => {
    const { tenant } = seedTenantInRoom(10000, 20000)
    const forMonth = `${new Date().toISOString().slice(0, 7)}-01`
    recordPayment({ tenantId: tenant.id, amount: 4000, paymentMode: 'upi', paymentDate: '2026-07-05', forMonth, notes: null, receiptUrl: null })

    expect(getDemoDb().tenants.find((t) => t.id === tenant.id)?.rentStatus).toBe('partial')
  })

  it('does not touch rentStatus when the payment is for a past month, not the current one', () => {
    const { tenant } = seedTenantInRoom(10000, 20000)
    recordPayment({ tenantId: tenant.id, amount: 10000, paymentMode: 'cash', paymentDate: '2026-01-05', forMonth: '2026-01-01', notes: null, receiptUrl: null })

    expect(getDemoDb().tenants.find((t) => t.id === tenant.id)?.rentStatus).toBe('pending')
  })

  it('numbers receipts sequentially across payments', () => {
    const { tenant } = seedTenantInRoom(10000, 20000)
    recordPayment({ tenantId: tenant.id, amount: 5000, paymentMode: 'cash', paymentDate: '2026-01-05', forMonth: '2026-01-01', notes: null, receiptUrl: null })
    recordPayment({ tenantId: tenant.id, amount: 5000, paymentMode: 'cash', paymentDate: '2026-02-05', forMonth: '2026-02-01', notes: null, receiptUrl: null })

    const receipts = getDemoDb().payments.map((p) => p.receiptNumber).sort()
    expect(receipts).toEqual(['RCPT-0001', 'RCPT-0002'])
  })
})

describe('recordDeposit', () => {
  beforeEach(() => clearDemoDb())

  it('stores the deposit with a real recordedAt timestamp, distinct from the backdatable paidDate', () => {
    const { tenant } = seedTenantInRoom(10000, 20000)
    recordDeposit({ tenantId: tenant.id, amount: 20000, paidDate: '2026-01-01', screenshotUrl: null })

    const stored = getDemoDb().tenants.find((t) => t.id === tenant.id)?.depositRecord
    expect(stored?.amount).toBe(20000)
    expect(stored?.paidDate).toBe('2026-01-01')
    expect(stored?.recordedAt).toBeTruthy()
    expect(stored?.recordedAt).not.toBe('2026-01-01')
  })
})

describe('vacateTenant / reassignTenant / unassignTenant (bed-occupancy integrity)', () => {
  beforeEach(() => clearDemoDb())

  it('vacating a tenant frees their bed and ends their stay', () => {
    const { beds, tenant } = seedTenantInRoom(10000, 20000)
    vacateTenant(tenant.id)

    const db = getDemoDb()
    expect(db.tenants.find((t) => t.id === tenant.id)?.status).toBe('vacated')
    expect(db.beds.find((b) => b.id === beds[0]!.id)?.status).toBe('vacant')
  })

  it('reassigning a tenant frees the old bed and occupies the new one', () => {
    const { beds, tenant } = seedTenantInRoom(10000, 20000)
    reassignTenant(tenant.id, beds[1]!.id)

    const db = getDemoDb()
    expect(db.beds.find((b) => b.id === beds[0]!.id)?.status).toBe('vacant')
    expect(db.beds.find((b) => b.id === beds[1]!.id)?.status).toBe('occupied')
    expect(db.tenants.find((t) => t.id === tenant.id)?.bedId).toBe(beds[1]!.id)
  })

  it('refuses to reassign into a bed that is already occupied', () => {
    const { beds, tenant } = seedTenantInRoom(10000, 20000)
    addTenant({
      bedId: beds[1]!.id,
      name: 'Second Tenant', phone: '9999999999', email: null, aadhaarNumber: null,
      emergencyContactName: null, emergencyContactPhone: null, bloodGroup: null,
      occupation: null, company: null, photoUrl: null, rent: 8000, deposit: 8000,
    })

    expect(() => reassignTenant(tenant.id, beds[1]!.id)).toThrow('already occupied')
  })

  it('unassigning a tenant frees the bed but keeps them active', () => {
    const { beds, tenant } = seedTenantInRoom(10000, 20000)
    unassignTenant(tenant.id)

    const db = getDemoDb()
    const updated = db.tenants.find((t) => t.id === tenant.id)
    expect(updated?.status).toBe('active')
    expect(updated?.bedId).toBeNull()
    expect(db.beds.find((b) => b.id === beds[0]!.id)?.status).toBe('vacant')
  })
})
