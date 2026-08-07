import type { RentStatus, TenantStatus } from './database.types'

/**
 * Canonical tenant record shared across the Building drill-down (house →
 * tenant preview) and the Tenants feature (list/detail) so both read the
 * exact same shape from the demo store instead of maintaining two views
 * that can drift apart.
 */
export interface Tenant {
  id: string
  houseId: string | null
  houseNumber: string
  floorName: string
  name: string
  phone: string
  aadhaarNumber: string | null
  address: string | null
  occupation: string | null
  photoUrl: string | null
  joiningDate: string
  vacatingDate: string | null
  advance: number
  deposit: number
  rent: number
  rentStatus: RentStatus
  status: TenantStatus
  notes: string | null
  depositRecord: DepositRecord | null
}

export interface DepositRecord {
  amount: number
  paidDate: string
  screenshotUrl: string | null
  /** When this deposit was actually recorded — distinct from `paidDate`,
   * which the user can backdate. Carries the real time of day. */
  recordedAt: string
}
