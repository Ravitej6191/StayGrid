import type {
  ExpenseCategory,
  HouseType,
  LenderType,
  PaymentMode,
  PropertyType,
  RentStatus,
  TenantStatus,
} from '@/types/database.types'
import type { Tenant } from '@/types/domain'
import { formatCurrency, monthKey as localMonthKey, todayIso } from '@/utils/format'

/**
 * Local, mutable "demo database" — a single localStorage-persisted JSON
 * blob standing in for Supabase while no real project is connected. Every
 * feature service's demo-mode branch reads/writes through the functions
 * here instead of frozen fixtures, and calls `queryClient.invalidateQueries`
 * afterward — the same mutate → invalidate → refetch shape real Supabase
 * mutations will use later, so swapping in a real backend is additive.
 */

const STORAGE_KEY = 'jeevanam.demoDb'
const BUILDING_ID = 'bld-1'

/** Sums a tenant's payments for the given `forMonth` (YYYY-MM-01) and derives
 * the resulting rent status against their current rent. */
export function computeMonthlyRentStatus(payments: DemoPayment[], tenantId: string, forMonth: string, rent: number): RentStatus {
  const total = payments
    .filter((p) => p.tenantId === tenantId && p.forMonth === forMonth)
    .reduce((sum, p) => sum + p.amount, 0)
  if (total <= 0) return 'pending'
  return total >= rent ? 'paid' : 'partial'
}

export interface DemoBuilding {
  id: string
  name: string
  propertyType: PropertyType
  address: string
  city: string
  state: string
  pincode: string
  contactPhone: string
  contactEmail: string
}

export interface DemoFloor {
  id: string
  buildingId: string
  floorNumber: number
  name: string
}

/** A floor's individually rentable unit. Holds at most one active tenant. */
export interface DemoHouse {
  id: string
  floorId: string
  houseNumber: string
  houseType: HouseType
  gasConnectionNumber: string | null
  electricityBillNumber: string | null
}

export interface DemoTenant {
  id: string
  houseId: string | null
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
  depositRecord: DemoDepositRecord | null
}

export interface DemoDepositRecord {
  amount: number
  paidDate: string
  screenshotUrl: string | null
  /** When this deposit was actually recorded — distinct from `paidDate`,
   * which the user can backdate. Carries the real time of day. */
  recordedAt: string
}

export interface DemoPayment {
  id: string
  tenantId: string
  amount: number
  paymentDate: string
  paymentMode: PaymentMode
  forMonth: string
  status: RentStatus
  receiptNumber: string | null
  receiptUrl: string | null
  notes: string | null
  /** When this payment was actually recorded — distinct from `paymentDate`,
   * which the user can backdate. Carries the real time of day. */
  createdAt: string
}

export interface DemoExpense {
  id: string
  category: ExpenseCategory
  amount: number
  expenseDate: string
  description: string | null
  imageUrls: string[]
  /** When this expense was actually recorded — distinct from `expenseDate`,
   * which the user can backdate. Carries the real time of day. */
  createdAt: string
}

export interface DemoLoan {
  id: string
  lenderType: LenderType
  lenderName: string | null
  amount: number
  interestNote: string | null
  takenOn: string
  takenTill: string | null
  notes: string | null
  createdAt: string
}

export interface DemoLoanRepayment {
  id: string
  loanId: string
  amount: number
  paymentDate: string
  notes: string | null
  createdAt: string
}

export interface DemoBroadcast {
  id: string
  message: string
  imageUrl: string | null
  audience: string
  sentAt: string
  recipientCount: number
  deliveredCount: number
}

export interface DemoSettings {
  ownerName: string | null
  onboardingCompleted: boolean
  lastRentResetMonth: string | null
}

export type NotificationType = 'tenant' | 'payment' | 'expense' | 'broadcast'

export interface DemoNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  createdAt: string
  read: boolean
}

export interface DemoDb {
  settings: DemoSettings
  building: DemoBuilding
  floors: DemoFloor[]
  houses: DemoHouse[]
  tenants: DemoTenant[]
  payments: DemoPayment[]
  loans: DemoLoan[]
  loanRepayments: DemoLoanRepayment[]
  expenses: DemoExpense[]
  broadcasts: DemoBroadcast[]
  notifications: DemoNotification[]
}

function emptyDb(): DemoDb {
  return {
    settings: { ownerName: null, onboardingCompleted: false, lastRentResetMonth: null },
    building: {
      id: BUILDING_ID,
      name: '',
      propertyType: 'pg',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contactPhone: '',
      contactEmail: '',
    },
    floors: [],
    houses: [],
    tenants: [],
    payments: [],
    loans: [],
    loanRepayments: [],
    expenses: [],
    broadcasts: [],
    notifications: [],
  }
}

/** Wipes the local demo database so the next demo session starts fresh. */
export function clearDemoDb(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/** All active tenants become rent-pending again at the start of a new
 * calendar month, until a fresh payment is recorded for that month. */
function applyMonthlyRentReset(db: DemoDb): DemoDb {
  const month = localMonthKey(new Date())
  if (!db.settings.onboardingCompleted || db.settings.lastRentResetMonth === month) return db
  return {
    ...db,
    settings: { ...db.settings, lastRentResetMonth: month },
    tenants: db.tenants.map((t) => (t.status === 'active' ? { ...t, rentStatus: 'pending' } : t)),
  }
}

export function getDemoDb(): DemoDb {
  if (typeof window === 'undefined') return emptyDb()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyDb()
  try {
    const parsed = JSON.parse(raw) as DemoDb
    const merged = { ...emptyDb(), ...parsed }
    const withReset = applyMonthlyRentReset(merged)
    if (withReset !== merged) localStorage.setItem(STORAGE_KEY, JSON.stringify(withReset))
    return withReset
  } catch {
    return emptyDb()
  }
}

function setDemoDb(db: DemoDb): DemoDb {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  return db
}

function updateDemoDb(updater: (db: DemoDb) => DemoDb): DemoDb {
  return setDemoDb(updater(getDemoDb()))
}

export interface OnboardingSeedInput {
  propertyType: PropertyType
  buildingName: string
  address: string
  city: string
  state: string
  pincode: string
  ownerName: string
  phone: string
}

export function seedFromOnboarding(input: OnboardingSeedInput): DemoDb {
  return updateDemoDb(() => ({
    settings: { ownerName: input.ownerName, onboardingCompleted: true, lastRentResetMonth: null },
    building: {
      id: BUILDING_ID,
      name: input.buildingName,
      propertyType: input.propertyType,
      address: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      contactPhone: input.phone,
      contactEmail: '',
    },
    floors: [],
    houses: [],
    tenants: [],
    payments: [],
    loans: [],
    loanRepayments: [],
    expenses: [],
    broadcasts: [],
    notifications: [],
  }))
}

export interface AddFloorInput {
  name: string
  floorNumber: number
}

export function addFloor(input: AddFloorInput): DemoFloor {
  const floor: DemoFloor = {
    id: crypto.randomUUID(),
    buildingId: BUILDING_ID,
    floorNumber: input.floorNumber,
    name: input.name,
  }
  updateDemoDb((db) => ({ ...db, floors: [...db.floors, floor] }))
  return floor
}

export function updateFloor(floorId: string, name: string): void {
  updateDemoDb((db) => ({
    ...db,
    floors: db.floors.map((f) => (f.id === floorId ? { ...f, name } : f)),
  }))
}

export function deleteFloor(floorId: string): void {
  const db = getDemoDb()
  const houseIds = new Set(db.houses.filter((h) => h.floorId === floorId).map((h) => h.id))
  const hasActiveTenant = db.tenants.some((t) => t.status === 'active' && t.houseId !== null && houseIds.has(t.houseId))
  if (hasActiveTenant) {
    throw new Error('Move or vacate tenants on this floor before deleting it.')
  }

  updateDemoDb((current) => ({
    ...current,
    floors: current.floors.filter((f) => f.id !== floorId),
    houses: current.houses.filter((h) => h.floorId !== floorId),
  }))
}

export interface AddHouseInput {
  floorId: string
  houseNumber: string
  houseType: HouseType
  gasConnectionNumber: string | null
  electricityBillNumber: string | null
}

export function addHouse(input: AddHouseInput): DemoHouse {
  const house: DemoHouse = {
    id: crypto.randomUUID(),
    floorId: input.floorId,
    houseNumber: input.houseNumber,
    houseType: input.houseType,
    gasConnectionNumber: input.gasConnectionNumber,
    electricityBillNumber: input.electricityBillNumber,
  }
  updateDemoDb((db) => ({ ...db, houses: [...db.houses, house] }))
  return house
}

export interface UpdateHouseInput {
  id: string
  houseNumber: string
  houseType: HouseType
  gasConnectionNumber: string | null
  electricityBillNumber: string | null
}

export function updateHouse(input: UpdateHouseInput): void {
  updateDemoDb((current) => ({
    ...current,
    houses: current.houses.map((h) =>
      h.id === input.id
        ? {
            ...h,
            houseNumber: input.houseNumber,
            houseType: input.houseType,
            gasConnectionNumber: input.gasConnectionNumber,
            electricityBillNumber: input.electricityBillNumber,
          }
        : h,
    ),
  }))
}

export function deleteHouse(houseId: string): void {
  const db = getDemoDb()
  const hasActiveTenant = db.tenants.some((t) => t.status === 'active' && t.houseId === houseId)
  if (hasActiveTenant) {
    throw new Error('Move or vacate tenants in this house before deleting it.')
  }

  updateDemoDb((current) => ({
    ...current,
    houses: current.houses.filter((h) => h.id !== houseId),
  }))
}

export function updateBuildingProfile(patch: Partial<DemoBuilding> & { ownerName?: string }): DemoDb {
  return updateDemoDb((db) => ({
    ...db,
    settings: { ...db.settings, ownerName: patch.ownerName ?? db.settings.ownerName },
    building: { ...db.building, ...patch },
  }))
}

/** Joins a stored tenant record with its house → floor to produce the
 * canonical `Tenant` domain shape shared by Building and the Tenants feature. */
export function resolveTenant(db: DemoDb, demoTenant: DemoTenant): Tenant {
  const house = demoTenant.houseId ? db.houses.find((h) => h.id === demoTenant.houseId) : undefined
  const floor = house ? db.floors.find((f) => f.id === house.floorId) : undefined
  const currentMonthForMonth = `${localMonthKey(new Date())}-01`
  const rentStatus = computeMonthlyRentStatus(db.payments, demoTenant.id, currentMonthForMonth, demoTenant.rent)

  return {
    id: demoTenant.id,
    houseId: demoTenant.houseId,
    houseNumber: house?.houseNumber ?? '',
    floorName: floor?.name ?? '',
    name: demoTenant.name,
    phone: demoTenant.phone,
    aadhaarNumber: demoTenant.aadhaarNumber,
    address: demoTenant.address,
    occupation: demoTenant.occupation,
    photoUrl: demoTenant.photoUrl,
    joiningDate: demoTenant.joiningDate,
    vacatingDate: demoTenant.vacatingDate,
    advance: demoTenant.advance,
    deposit: demoTenant.deposit,
    rent: demoTenant.rent,
    rentStatus,
    status: demoTenant.status,
    notes: demoTenant.notes,
    depositRecord: demoTenant.depositRecord,
  }
}

function pushNotification(type: NotificationType, title: string, message: string): void {
  const notification: DemoNotification = {
    id: crypto.randomUUID(),
    type,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  }
  updateDemoDb((db) => ({ ...db, notifications: [notification, ...db.notifications] }))
}

export function getNotifications(): DemoNotification[] {
  return getDemoDb().notifications
}

export function clearAllNotifications(): void {
  updateDemoDb((db) => ({ ...db, notifications: [] }))
}

export function markAllNotificationsRead(): void {
  updateDemoDb((db) => ({ ...db, notifications: db.notifications.map((n) => ({ ...n, read: true })) }))
}

export interface AddTenantInput {
  houseId: string | null
  name: string
  phone: string
  aadhaarNumber: string | null
  occupation: string | null
  photoUrl: string | null
  rent: number
  deposit: number
}

export function addTenant(input: AddTenantInput): DemoTenant {
  const db = getDemoDb()
  if (input.houseId) {
    const isOccupied = db.tenants.some((t) => t.status === 'active' && t.houseId === input.houseId)
    if (isOccupied) throw new Error('That house is already occupied.')
  }

  const tenant: DemoTenant = {
    id: crypto.randomUUID(),
    houseId: input.houseId,
    name: input.name,
    phone: input.phone,
    aadhaarNumber: input.aadhaarNumber,
    address: null,
    occupation: input.occupation,
    photoUrl: input.photoUrl,
    joiningDate: todayIso(),
    vacatingDate: null,
    advance: 0,
    deposit: input.deposit,
    rent: input.rent,
    rentStatus: 'pending',
    status: 'active',
    notes: null,
    depositRecord: null,
  }

  updateDemoDb((db) => ({ ...db, tenants: [...db.tenants, tenant] }))

  pushNotification('tenant', 'Tenant added', `${input.name} was added as a tenant.`)

  return tenant
}

export interface UpdateTenantInput {
  id: string
  name: string
  phone: string
  aadhaarNumber: string | null
  occupation: string | null
  photoUrl: string | null
  rent: number
  deposit: number
}

export function updateTenant(input: UpdateTenantInput): void {
  const currentMonthForMonth = `${localMonthKey(new Date())}-01`
  updateDemoDb((db) => {
    const existing = db.tenants.find((t) => t.id === input.id)
    const rentChanged = existing && existing.rent !== input.rent
    const newStatus = rentChanged
      ? computeMonthlyRentStatus(db.payments, input.id, currentMonthForMonth, input.rent)
      : existing?.rentStatus

    return {
      ...db,
      tenants: db.tenants.map((t) =>
        t.id === input.id
          ? {
              ...t,
              name: input.name,
              phone: input.phone,
              aadhaarNumber: input.aadhaarNumber,
              occupation: input.occupation,
              photoUrl: input.photoUrl,
              rent: input.rent,
              deposit: input.deposit,
              rentStatus: newStatus ?? t.rentStatus,
            }
          : t,
      ),
    }
  })
}

export function reassignTenant(tenantId: string, newHouseId: string): void {
  updateDemoDb((db) => {
    const isOccupied = db.tenants.some(
      (t) => t.status === 'active' && t.houseId === newHouseId && t.id !== tenantId,
    )
    if (isOccupied) {
      throw new Error('That house is already occupied.')
    }
    return {
      ...db,
      tenants: db.tenants.map((t) => (t.id === tenantId ? { ...t, houseId: newHouseId } : t)),
    }
  })
}

/** Frees the tenant's house but keeps them active and unassigned — distinct
 * from `vacateTenant`, which ends their stay entirely. Lets an owner pull a
 * tenant out of a house without losing their record (e.g. re-allotting them
 * elsewhere later). */
export function unassignTenant(tenantId: string): void {
  updateDemoDb((db) => ({
    ...db,
    tenants: db.tenants.map((t) => (t.id === tenantId ? { ...t, houseId: null } : t)),
  }))
}

export function vacateTenant(tenantId: string): void {
  updateDemoDb((db) => ({
    ...db,
    tenants: db.tenants.map((t) =>
      t.id === tenantId ? { ...t, status: 'vacated', vacatingDate: todayIso(), houseId: null } : t,
    ),
  }))
}

export interface RecordPaymentInput {
  tenantId: string
  amount: number
  paymentMode: PaymentMode
  paymentDate: string
  forMonth: string
  notes: string | null
  receiptUrl: string | null
}

export function recordPayment(input: RecordPaymentInput): DemoPayment {
  const db = getDemoDb()
  const tenant = db.tenants.find((t) => t.id === input.tenantId)
  const priorTotal = db.payments
    .filter((p) => p.tenantId === input.tenantId && p.forMonth === input.forMonth)
    .reduce((sum, p) => sum + p.amount, 0)
  const cumulativeTotal = priorTotal + input.amount
  const status: RentStatus = tenant && cumulativeTotal >= tenant.rent ? 'paid' : 'partial'

  const payment: DemoPayment = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    amount: input.amount,
    paymentDate: input.paymentDate,
    paymentMode: input.paymentMode,
    forMonth: input.forMonth,
    status,
    receiptNumber: `RCPT-${String(db.payments.length + 1).padStart(4, '0')}`,
    receiptUrl: input.receiptUrl,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  }

  const currentMonthForMonth = `${localMonthKey(new Date())}-01`

  updateDemoDb((current) => ({
    ...current,
    payments: [...current.payments, payment],
    tenants: current.tenants.map((t) =>
      t.id === input.tenantId && input.forMonth === currentMonthForMonth ? { ...t, rentStatus: status } : t,
    ),
  }))

  pushNotification(
    'payment',
    'Payment recorded',
    `${formatCurrency(input.amount)} received from ${tenant?.name ?? 'a tenant'}.`,
  )

  return payment
}

export function deletePayment(paymentId: string): void {
  updateDemoDb((db) => {
    const payment = db.payments.find((p) => p.id === paymentId)
    if (!payment) return db
    const remaining = db.payments.filter((p) => p.id !== paymentId)
    const currentMonthForMonth = `${localMonthKey(new Date())}-01`
    if (payment.forMonth !== currentMonthForMonth) {
      return { ...db, payments: remaining }
    }
    const tenant = db.tenants.find((t) => t.id === payment.tenantId)
    const newStatus = tenant ? computeMonthlyRentStatus(remaining, payment.tenantId, currentMonthForMonth, tenant.rent) : 'pending'
    return {
      ...db,
      payments: remaining,
      tenants: db.tenants.map((t) => (t.id === payment.tenantId ? { ...t, rentStatus: newStatus } : t)),
    }
  })
}

export interface RecordDepositInput {
  tenantId: string
  amount: number
  paidDate: string
  screenshotUrl: string | null
}

export function recordDeposit(input: RecordDepositInput): void {
  const tenant = getDemoDb().tenants.find((t) => t.id === input.tenantId)

  updateDemoDb((db) => ({
    ...db,
    tenants: db.tenants.map((t) =>
      t.id === input.tenantId
        ? {
            ...t,
            depositRecord: {
              amount: input.amount,
              paidDate: input.paidDate,
              screenshotUrl: input.screenshotUrl,
              recordedAt: new Date().toISOString(),
            },
          }
        : t,
    ),
  }))

  pushNotification('payment', 'Deposit recorded', `${formatCurrency(input.amount)} deposit recorded for ${tenant?.name ?? 'a tenant'}.`)
}

export function deleteDeposit(tenantId: string): void {
  updateDemoDb((db) => ({
    ...db,
    tenants: db.tenants.map((t) => (t.id === tenantId ? { ...t, depositRecord: null } : t)),
  }))
}

export interface AddLoanInput {
  lenderType: LenderType
  lenderName: string | null
  amount: number
  interestNote: string | null
  takenOn: string
  takenTill: string | null
  notes: string | null
}

export function addLoan(input: AddLoanInput): DemoLoan {
  const loan: DemoLoan = { id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString() }
  updateDemoDb((db) => ({ ...db, loans: [...db.loans, loan] }))
  pushNotification('expense', 'Loan added', `${formatCurrency(input.amount)} loan recorded.`)
  return loan
}

export interface UpdateLoanInput extends AddLoanInput {
  id: string
}

export function updateLoan(input: UpdateLoanInput): void {
  updateDemoDb((db) => ({
    ...db,
    loans: db.loans.map((l) =>
      l.id === input.id
        ? {
            ...l,
            lenderType: input.lenderType,
            lenderName: input.lenderName,
            amount: input.amount,
            interestNote: input.interestNote,
            takenOn: input.takenOn,
            takenTill: input.takenTill,
            notes: input.notes,
          }
        : l,
    ),
  }))
}

export function deleteLoan(loanId: string): void {
  updateDemoDb((db) => ({
    ...db,
    loans: db.loans.filter((l) => l.id !== loanId),
    loanRepayments: db.loanRepayments.filter((r) => r.loanId !== loanId),
  }))
}

export interface AddLoanRepaymentInput {
  loanId: string
  amount: number
  paymentDate: string
  notes: string | null
}

export function addLoanRepayment(input: AddLoanRepaymentInput): DemoLoanRepayment {
  const repayment: DemoLoanRepayment = { id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString() }
  updateDemoDb((db) => ({ ...db, loanRepayments: [...db.loanRepayments, repayment] }))
  pushNotification('expense', 'Loan repayment recorded', `${formatCurrency(input.amount)} repaid towards a loan.`)
  return repayment
}

export function deleteLoanRepayment(repaymentId: string): void {
  updateDemoDb((db) => ({ ...db, loanRepayments: db.loanRepayments.filter((r) => r.id !== repaymentId) }))
}

export interface AddExpenseInput {
  category: ExpenseCategory
  amount: number
  expenseDate: string
  description: string | null
  imageUrls: string[]
}

export function addExpense(input: AddExpenseInput): DemoExpense {
  const expense: DemoExpense = { id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString() }
  updateDemoDb((db) => ({ ...db, expenses: [...db.expenses, expense] }))
  pushNotification('expense', 'Expense added', `${formatCurrency(input.amount)} expense recorded.`)
  return expense
}

export interface UpdateExpenseInput extends AddExpenseInput {
  id: string
}

export function updateExpense(input: UpdateExpenseInput): void {
  updateDemoDb((db) => ({
    ...db,
    expenses: db.expenses.map((e) =>
      e.id === input.id
        ? {
            ...e,
            category: input.category,
            amount: input.amount,
            expenseDate: input.expenseDate,
            description: input.description,
            imageUrls: input.imageUrls,
          }
        : e,
    ),
  }))
}

export function deleteExpense(expenseId: string): void {
  updateDemoDb((db) => ({ ...db, expenses: db.expenses.filter((e) => e.id !== expenseId) }))
}

export interface SendBroadcastInput {
  message: string
  imageUrl: string | null
  audience: string
  recipientCount: number
  deliveredCount: number
}

export function sendBroadcast(input: SendBroadcastInput): DemoBroadcast {
  const broadcast: DemoBroadcast = { id: crypto.randomUUID(), sentAt: new Date().toISOString(), ...input }
  updateDemoDb((db) => ({ ...db, broadcasts: [...db.broadcasts, broadcast] }))
  pushNotification(
    'broadcast',
    'Broadcast sent',
    `Delivered to ${input.deliveredCount}/${input.recipientCount} tenant${input.recipientCount === 1 ? '' : 's'} (${input.audience}).`,
  )
  return broadcast
}
