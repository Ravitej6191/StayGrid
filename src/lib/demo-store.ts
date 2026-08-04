import type {
  ExpenseCategory,
  PaymentMode,
  PropertyType,
  RentStatus,
  RoomType,
  TenantStatus,
} from '@/types/database.types'
import type { Tenant } from '@/types/domain'
import { formatCurrency, monthKey as localMonthKey, todayIso } from '@/utils/format'
import { areNotificationsEnabled } from './notification-prefs'

/**
 * Local, mutable "demo database" — a single localStorage-persisted JSON
 * blob standing in for Supabase while no real project is connected. Every
 * feature service's demo-mode branch reads/writes through the functions
 * here instead of frozen fixtures, and calls `queryClient.invalidateQueries`
 * afterward — the same mutate → invalidate → refetch shape real Supabase
 * mutations will use later, so swapping in a real backend is additive.
 */

const STORAGE_KEY = 'staygrid.demoDb'
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
  gstNumber: string | null
  panNumber: string | null
}

export interface DemoFloor {
  id: string
  buildingId: string
  floorNumber: number
  name: string
}

export interface DemoRoom {
  id: string
  floorId: string
  roomNumber: string
  roomType: RoomType
  capacity: number
}

export interface DemoBed {
  id: string
  roomId: string
  bedLabel: string
  status: 'vacant' | 'occupied'
}

export interface DemoTenant {
  id: string
  bedId: string | null
  name: string
  phone: string
  email: string | null
  aadhaarNumber: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  address: string | null
  occupation: string | null
  company: string | null
  bloodGroup: string | null
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
  imageUrl: string | null
  /** When this expense was actually recorded — distinct from `expenseDate`,
   * which the user can backdate. Carries the real time of day. */
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
  rooms: DemoRoom[]
  beds: DemoBed[]
  tenants: DemoTenant[]
  payments: DemoPayment[]
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
      gstNumber: null,
      panNumber: null,
    },
    floors: [],
    rooms: [],
    beds: [],
    tenants: [],
    payments: [],
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
  gstNumber: string | null
  panNumber: string | null
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
      gstNumber: input.gstNumber,
      panNumber: input.panNumber,
    },
    floors: [],
    rooms: [],
    beds: [],
    tenants: [],
    payments: [],
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
  const roomIds = db.rooms.filter((r) => r.floorId === floorId).map((r) => r.id)
  const bedIds = new Set(db.beds.filter((b) => roomIds.includes(b.roomId)).map((b) => b.id))
  const hasActiveTenant = db.tenants.some((t) => t.status === 'active' && t.bedId !== null && bedIds.has(t.bedId))
  if (hasActiveTenant) {
    throw new Error('Move or vacate tenants on this floor before deleting it.')
  }

  updateDemoDb((current) => ({
    ...current,
    floors: current.floors.filter((f) => f.id !== floorId),
    rooms: current.rooms.filter((r) => r.floorId !== floorId),
    beds: current.beds.filter((b) => !roomIds.includes(b.roomId)),
  }))
}

export interface AddRoomInput {
  floorId: string
  roomNumber: string
  roomType: RoomType
  capacity: number
}

export function addRoom(input: AddRoomInput): { room: DemoRoom; beds: DemoBed[] } {
  const room: DemoRoom = {
    id: crypto.randomUUID(),
    floorId: input.floorId,
    roomNumber: input.roomNumber,
    roomType: input.roomType,
    capacity: input.capacity,
  }

  const beds: DemoBed[] = Array.from({ length: input.capacity }, (_, i) => ({
    id: crypto.randomUUID(),
    roomId: room.id,
    bedLabel: String.fromCharCode(65 + i),
    status: 'vacant',
  }))

  updateDemoDb((db) => ({ ...db, rooms: [...db.rooms, room], beds: [...db.beds, ...beds] }))
  return { room, beds }
}

function nextBedLabelIndex(existingLabels: string[]): number {
  let maxIndex = -1
  for (const label of existingLabels) {
    const index = label.charCodeAt(0) - 65
    if (index > maxIndex) maxIndex = index
  }
  return maxIndex + 1
}

export interface UpdateRoomInput {
  id: string
  roomNumber: string
  roomType: RoomType
  capacity: number
}

export function updateRoom(input: UpdateRoomInput): void {
  const db = getDemoDb()
  const existingBeds = db.beds.filter((b) => b.roomId === input.id)
  let beds = db.beds

  if (input.capacity > existingBeds.length) {
    const nextLabelStart = nextBedLabelIndex(existingBeds.map((b) => b.bedLabel))
    const newBeds: DemoBed[] = Array.from({ length: input.capacity - existingBeds.length }, (_, i) => ({
      id: crypto.randomUUID(),
      roomId: input.id,
      bedLabel: String.fromCharCode(65 + nextLabelStart + i),
      status: 'vacant',
    }))
    beds = [...db.beds, ...newBeds]
  } else if (input.capacity < existingBeds.length) {
    const removeCount = existingBeds.length - input.capacity
    const removableBeds = existingBeds.filter((b) => b.status === 'vacant')
    if (removableBeds.length < removeCount) {
      throw new Error('Vacate tenants before reducing the bed count.')
    }
    const idsToRemove = new Set(removableBeds.slice(0, removeCount).map((b) => b.id))
    beds = db.beds.filter((b) => !idsToRemove.has(b.id))
  }

  updateDemoDb((current) => ({
    ...current,
    rooms: current.rooms.map((r) =>
      r.id === input.id ? { ...r, roomNumber: input.roomNumber, roomType: input.roomType, capacity: input.capacity } : r,
    ),
    beds,
  }))
}

export function deleteRoom(roomId: string): void {
  const db = getDemoDb()
  const bedIds = new Set(db.beds.filter((b) => b.roomId === roomId).map((b) => b.id))
  const hasActiveTenant = db.tenants.some((t) => t.status === 'active' && t.bedId !== null && bedIds.has(t.bedId))
  if (hasActiveTenant) {
    throw new Error('Move or vacate tenants in this room before deleting it.')
  }

  updateDemoDb((current) => ({
    ...current,
    rooms: current.rooms.filter((r) => r.id !== roomId),
    beds: current.beds.filter((b) => b.roomId !== roomId),
  }))
}

export function updateBuildingProfile(patch: Partial<DemoBuilding> & { ownerName?: string }): DemoDb {
  return updateDemoDb((db) => ({
    ...db,
    settings: { ...db.settings, ownerName: patch.ownerName ?? db.settings.ownerName },
    building: { ...db.building, ...patch },
  }))
}

/** Joins a stored tenant record with its bed → room → floor to produce the
 * canonical `Tenant` domain shape shared by Building and the Tenants feature. */
export function resolveTenant(db: DemoDb, demoTenant: DemoTenant): Tenant {
  const bed = demoTenant.bedId ? db.beds.find((b) => b.id === demoTenant.bedId) : undefined
  const room = bed ? db.rooms.find((r) => r.id === bed.roomId) : undefined
  const floor = room ? db.floors.find((f) => f.id === room.floorId) : undefined

  return {
    id: demoTenant.id,
    bedId: demoTenant.bedId,
    roomId: room?.id ?? '',
    roomNumber: room?.roomNumber ?? '',
    floorName: floor?.name ?? '',
    name: demoTenant.name,
    phone: demoTenant.phone,
    email: demoTenant.email,
    aadhaarNumber: demoTenant.aadhaarNumber,
    emergencyContactName: demoTenant.emergencyContactName,
    emergencyContactPhone: demoTenant.emergencyContactPhone,
    address: demoTenant.address,
    occupation: demoTenant.occupation,
    company: demoTenant.company,
    bloodGroup: demoTenant.bloodGroup,
    photoUrl: demoTenant.photoUrl,
    joiningDate: demoTenant.joiningDate,
    vacatingDate: demoTenant.vacatingDate,
    advance: demoTenant.advance,
    deposit: demoTenant.deposit,
    rent: demoTenant.rent,
    rentStatus: demoTenant.rentStatus,
    status: demoTenant.status,
    notes: demoTenant.notes,
    depositRecord: demoTenant.depositRecord,
  }
}

function pushNotification(type: NotificationType, title: string, message: string): void {
  if (!areNotificationsEnabled()) return
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
  bedId: string | null
  name: string
  phone: string
  email: string | null
  aadhaarNumber: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  bloodGroup: string | null
  occupation: string | null
  company: string | null
  photoUrl: string | null
  rent: number
  deposit: number
}

export function addTenant(input: AddTenantInput): DemoTenant {
  if (input.bedId) {
    const db = getDemoDb()
    const bed = db.beds.find((b) => b.id === input.bedId)
    if (bed?.status === 'occupied') throw new Error('That bed is already occupied.')
  }

  const tenant: DemoTenant = {
    id: crypto.randomUUID(),
    bedId: input.bedId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    aadhaarNumber: input.aadhaarNumber,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    address: null,
    occupation: input.occupation,
    company: input.company,
    bloodGroup: input.bloodGroup,
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

  updateDemoDb((db) => ({
    ...db,
    tenants: [...db.tenants, tenant],
    beds: input.bedId ? db.beds.map((b) => (b.id === input.bedId ? { ...b, status: 'occupied' } : b)) : db.beds,
  }))

  pushNotification('tenant', 'Tenant added', `${input.name} was added as a tenant.`)

  return tenant
}

export interface UpdateTenantInput {
  id: string
  name: string
  phone: string
  email: string | null
  aadhaarNumber: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  bloodGroup: string | null
  occupation: string | null
  company: string | null
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
              email: input.email,
              aadhaarNumber: input.aadhaarNumber,
              emergencyContactName: input.emergencyContactName,
              emergencyContactPhone: input.emergencyContactPhone,
              bloodGroup: input.bloodGroup,
              occupation: input.occupation,
              company: input.company,
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

export function reassignTenant(tenantId: string, newBedId: string): void {
  updateDemoDb((db) => {
    const tenant = db.tenants.find((t) => t.id === tenantId)
    const oldBedId = tenant?.bedId ?? null
    const targetBed = db.beds.find((b) => b.id === newBedId)
    if (targetBed?.status === 'occupied' && newBedId !== oldBedId) {
      throw new Error('That bed is already occupied.')
    }
    return {
      ...db,
      tenants: db.tenants.map((t) => (t.id === tenantId ? { ...t, bedId: newBedId } : t)),
      beds: db.beds.map((b) => {
        if (b.id === newBedId) return { ...b, status: 'occupied' }
        if (b.id === oldBedId) return { ...b, status: 'vacant' }
        return b
      }),
    }
  })
}

/** Frees the tenant's bed but keeps them active and unassigned — distinct
 * from `vacateTenant`, which ends their stay entirely. Lets an owner pull a
 * tenant out of a room without losing their record (e.g. re-allotting them
 * elsewhere later). */
export function unassignTenant(tenantId: string): void {
  updateDemoDb((db) => {
    const tenant = db.tenants.find((t) => t.id === tenantId)
    const bedId = tenant?.bedId ?? null
    return {
      ...db,
      tenants: db.tenants.map((t) => (t.id === tenantId ? { ...t, bedId: null } : t)),
      beds: db.beds.map((b) => (b.id === bedId ? { ...b, status: 'vacant' } : b)),
    }
  })
}

export function vacateTenant(tenantId: string): void {
  updateDemoDb((db) => {
    const tenant = db.tenants.find((t) => t.id === tenantId)
    const bedId = tenant?.bedId ?? null
    return {
      ...db,
      tenants: db.tenants.map((t) =>
        t.id === tenantId
          ? { ...t, status: 'vacated', vacatingDate: todayIso(), bedId: null }
          : t,
      ),
      beds: db.beds.map((b) => (b.id === bedId ? { ...b, status: 'vacant' } : b)),
    }
  })
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

export interface AddExpenseInput {
  category: ExpenseCategory
  amount: number
  expenseDate: string
  description: string | null
  imageUrl: string | null
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
            imageUrl: input.imageUrl,
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
