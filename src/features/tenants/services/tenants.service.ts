import { isDemoSession } from '@/config/env'
import { supabase } from '@/lib/supabase'
import {
  addTenant as demoAddTenant,
  deleteDeposit as demoDeleteDeposit,
  deletePayment as demoDeletePayment,
  getDemoDb,
  reassignTenant as demoReassignTenant,
  recordDeposit as demoRecordDeposit,
  recordPayment as demoRecordPayment,
  resolveTenant,
  unassignTenant as demoUnassignTenant,
  updateTenant as demoUpdateTenant,
  vacateTenant as demoVacateTenant,
  type AddTenantInput as DemoAddTenantInput,
  type RecordDepositInput as DemoRecordDepositInput,
  type UpdateTenantInput as DemoUpdateTenantInput,
} from '@/lib/demo-store'
import { pushSupabaseNotification } from '@/features/notifications/services/notifications.service'
import { formatCurrency, monthKey, todayIso } from '@/utils/format'
import type { PaymentMode, RentStatus, TenantRow } from '@/types/database.types'
import type { Tenant } from '@/types/domain'

function computeRentStatus(rent: number, paidThisMonth: number): RentStatus {
  if (paidThisMonth <= 0) return 'pending'
  return paidThisMonth >= rent ? 'paid' : 'partial'
}

function mapTenantRow(row: TenantRow, houseNumber: string, floorName: string, paidThisMonth = 0): Tenant {
  return {
    id: row.id,
    houseId: row.house_id,
    houseNumber,
    floorName,
    name: row.name,
    phone: row.phone,
    aadhaarNumber: row.aadhaar_number,
    address: row.address,
    occupation: row.occupation,
    photoUrl: row.photo_url,
    joiningDate: row.joining_date,
    vacatingDate: row.vacating_date,
    advance: row.advance,
    deposit: row.deposit,
    rent: row.rent,
    rentStatus: computeRentStatus(row.rent, paidThisMonth),
    status: row.status,
    notes: row.notes,
    depositRecord:
      row.deposit_paid_amount !== null
        ? {
            amount: row.deposit_paid_amount,
            paidDate: row.deposit_paid_date ?? '',
            screenshotUrl: row.deposit_screenshot_url,
            recordedAt: row.deposit_recorded_at ?? row.deposit_paid_date ?? '',
          }
        : null,
  }
}

export async function getTenants(): Promise<Tenant[]> {
  if (isDemoSession()) {
    const db = getDemoDb()
    return db.tenants.map((t) => resolveTenant(db, t)).sort((a, b) => a.name.localeCompare(b.name))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: buildingRow, error: buildingError } = await supabase
    .from('building')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (buildingError) throw buildingError

  const { data: floors, error: floorsError } = await supabase
    .from('floors')
    .select('id, name')
    .eq('building_id', buildingRow.id)
  if (floorsError) throw floorsError
  const floorIds = floors.map((f) => f.id)

  const { data: houses, error: housesError } = await supabase
    .from('houses')
    .select('id, house_number, floor_id')
    .in('floor_id', floorIds)
  if (housesError) throw housesError

  const { data: tenantRows, error: tenantsError } = await supabase
    .from('tenants')
    .select('*')
    .eq('building_id', buildingRow.id)
  if (tenantsError) throw tenantsError

  const houseById = new Map(houses.map((h) => [h.id, h]))
  const floorNameById = new Map(floors.map((f) => [f.id, f.name]))

  const tenantIds = tenantRows.map((t) => t.id)
  const paidThisMonthByTenantId = new Map<string, number>()
  if (tenantIds.length > 0) {
    const { data: currentMonthPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('tenant_id, amount')
      .in('tenant_id', tenantIds)
      .eq('for_month', currentMonthForMonth())
    if (paymentsError) throw paymentsError
    for (const payment of currentMonthPayments) {
      paidThisMonthByTenantId.set(payment.tenant_id, (paidThisMonthByTenantId.get(payment.tenant_id) ?? 0) + payment.amount)
    }
  }

  return tenantRows.map((row) => {
    const house = row.house_id ? houseById.get(row.house_id) : undefined
    const floorName = house ? (floorNameById.get(house.floor_id) ?? '') : ''
    return mapTenantRow(row, house?.house_number ?? '', floorName, paidThisMonthByTenantId.get(row.id) ?? 0)
  })
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const tenants = await getTenants()
  return tenants.find((t) => t.id === id) ?? null
}

export interface PaymentHistoryItem {
  id: string
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

export async function getPaymentHistory(tenantId: string): Promise<PaymentHistoryItem[]> {
  if (isDemoSession()) {
    return getDemoDb()
      .payments.filter((p) => p.tenantId === tenantId)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMode: p.paymentMode,
        forMonth: p.forMonth,
        status: p.status,
        receiptNumber: p.receiptNumber,
        receiptUrl: p.receiptUrl,
        notes: p.notes,
        createdAt: p.createdAt,
      }))
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
  }

  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, payment_date, payment_mode, for_month, status, receipt_number, receipt_url, notes, created_at')
    .eq('tenant_id', tenantId)
    .order('payment_date', { ascending: false })
  if (error) throw error

  return data.map((p) => ({
    id: p.id,
    amount: p.amount,
    paymentDate: p.payment_date,
    paymentMode: p.payment_mode,
    forMonth: p.for_month,
    status: p.status,
    createdAt: p.created_at,
    receiptNumber: p.receipt_number,
    receiptUrl: p.receipt_url,
    notes: p.notes,
  }))
}

export type CreateTenantInput = DemoAddTenantInput

export async function createTenant(input: CreateTenantInput): Promise<string> {
  if (isDemoSession()) {
    return demoAddTenant(input).id
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: buildingRow, error: buildingError } = await supabase
    .from('building')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (buildingError) throw buildingError

  if (input.houseId) {
    const { count, error: countError } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('house_id', input.houseId)
      .eq('status', 'active')
    if (countError) throw countError
    if ((count ?? 0) > 0) throw new Error('That house is already occupied.')
  }

  const { data, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      building_id: buildingRow.id,
      house_id: input.houseId,
      name: input.name,
      phone: input.phone,
      aadhaar_number: input.aadhaarNumber,
      occupation: input.occupation,
      photo_url: input.photoUrl,
      rent: input.rent,
      deposit: input.deposit,
    })
    .select('id')
    .single()
  if (tenantError) throw tenantError

  await pushSupabaseNotification(buildingRow.id, 'tenant', 'Tenant added', `${input.name} was added as a tenant.`)

  return data.id
}

export type UpdateTenantInput = DemoUpdateTenantInput

function currentMonthForMonth(): string {
  return `${monthKey(new Date())}-01`
}

export async function updateTenant(input: UpdateTenantInput): Promise<void> {
  if (isDemoSession()) {
    demoUpdateTenant(input)
    return
  }

  const { data: existingTenant, error: fetchError } = await supabase
    .from('tenants')
    .select('rent')
    .eq('id', input.id)
    .single()
  if (fetchError) throw fetchError

  let rentStatusPatch: { rent_status: RentStatus } | Record<string, never> = {}
  if (existingTenant.rent !== input.rent) {
    const { data: monthPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('tenant_id', input.id)
      .eq('for_month', currentMonthForMonth())
    if (paymentsError) throw paymentsError
    const total = (monthPayments ?? []).reduce((sum, p) => sum + p.amount, 0)
    const status: RentStatus = total <= 0 ? 'pending' : total >= input.rent ? 'paid' : 'partial'
    rentStatusPatch = { rent_status: status }
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      name: input.name,
      phone: input.phone,
      aadhaar_number: input.aadhaarNumber,
      occupation: input.occupation,
      photo_url: input.photoUrl,
      rent: input.rent,
      deposit: input.deposit,
      ...rentStatusPatch,
    })
    .eq('id', input.id)
  if (error) throw error
}

export async function reassignTenant(tenantId: string, newHouseId: string): Promise<void> {
  if (isDemoSession()) {
    demoReassignTenant(tenantId, newHouseId)
    return
  }

  const { data: tenantRow, error: tenantFetchError } = await supabase
    .from('tenants')
    .select('house_id')
    .eq('id', tenantId)
    .single()
  if (tenantFetchError) throw tenantFetchError

  if (newHouseId !== tenantRow.house_id) {
    const { count, error: countError } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('house_id', newHouseId)
      .eq('status', 'active')
    if (countError) throw countError
    if ((count ?? 0) > 0) throw new Error('That house is already occupied.')
  }

  const { error: tenantError } = await supabase.from('tenants').update({ house_id: newHouseId }).eq('id', tenantId)
  if (tenantError) throw tenantError
}

/** Frees the tenant's house but keeps them active and unassigned — distinct
 * from `vacateTenant`, which ends their stay entirely. */
export async function unassignTenant(tenantId: string): Promise<void> {
  if (isDemoSession()) {
    demoUnassignTenant(tenantId)
    return
  }

  const { error } = await supabase.from('tenants').update({ house_id: null }).eq('id', tenantId)
  if (error) throw error
}

export async function vacateTenant(tenantId: string): Promise<void> {
  if (isDemoSession()) {
    demoVacateTenant(tenantId)
    return
  }

  const { error } = await supabase
    .from('tenants')
    .update({ status: 'vacated', vacating_date: todayIso(), house_id: null })
    .eq('id', tenantId)
  if (error) throw error
}

export interface CreatePaymentInput {
  tenantId: string
  amount: number
  paymentMode: PaymentMode
  paymentDate: string
  forMonth: string
  notes: string | null
  receiptUrl: string | null
}

export async function createPayment(input: CreatePaymentInput): Promise<void> {
  if (isDemoSession()) {
    demoRecordPayment(input)
    return
  }

  const { data: tenantRow, error: tenantError } = await supabase
    .from('tenants')
    .select('rent, name, building_id')
    .eq('id', input.tenantId)
    .single()
  if (tenantError) throw tenantError

  const { data: priorPayments, error: priorError } = await supabase
    .from('payments')
    .select('amount')
    .eq('tenant_id', input.tenantId)
    .eq('for_month', input.forMonth)
  if (priorError) throw priorError
  const priorTotal = (priorPayments ?? []).reduce((sum, p) => sum + p.amount, 0)
  const status: RentStatus = priorTotal + input.amount >= tenantRow.rent ? 'paid' : 'partial'

  const { error: paymentError } = await supabase.from('payments').insert({
    tenant_id: input.tenantId,
    amount: input.amount,
    payment_mode: input.paymentMode,
    payment_date: input.paymentDate,
    for_month: input.forMonth,
    status,
    notes: input.notes,
    receipt_url: input.receiptUrl,
    // No DB sequence for this yet, so a timestamp-derived tag is the
    // simplest way to give every payment a unique, human-shareable receipt
    // number — mirrors what demo mode shows without needing a real counter.
    receipt_number: `RCPT-${Date.now().toString(36).toUpperCase()}`,
  })
  if (paymentError) throw paymentError

  if (input.forMonth === currentMonthForMonth()) {
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ rent_status: status })
      .eq('id', input.tenantId)
    if (updateError) throw updateError
  }

  await pushSupabaseNotification(
    tenantRow.building_id,
    'payment',
    'Payment recorded',
    `${formatCurrency(input.amount)} received from ${tenantRow.name}.`,
  )
}

export type RecordDepositInput = DemoRecordDepositInput

export async function recordDeposit(input: RecordDepositInput): Promise<void> {
  if (isDemoSession()) {
    demoRecordDeposit(input)
    return
  }

  const { data: tenantRow, error: tenantError } = await supabase
    .from('tenants')
    .select('name, building_id')
    .eq('id', input.tenantId)
    .single()
  if (tenantError) throw tenantError

  const { error } = await supabase
    .from('tenants')
    .update({
      deposit_paid_amount: input.amount,
      deposit_paid_date: input.paidDate,
      deposit_screenshot_url: input.screenshotUrl,
      deposit_recorded_at: new Date().toISOString(),
    })
    .eq('id', input.tenantId)
  if (error) throw error

  await pushSupabaseNotification(
    tenantRow.building_id,
    'payment',
    'Deposit recorded',
    `${formatCurrency(input.amount)} deposit recorded for ${tenantRow.name}.`,
  )
}

export async function deleteDeposit(tenantId: string): Promise<void> {
  if (isDemoSession()) {
    demoDeleteDeposit(tenantId)
    return
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      deposit_paid_amount: null,
      deposit_paid_date: null,
      deposit_screenshot_url: null,
      deposit_recorded_at: null,
    })
    .eq('id', tenantId)
  if (error) throw error
}

export async function deletePayment(paymentId: string, tenantId: string): Promise<void> {
  if (isDemoSession()) {
    demoDeletePayment(paymentId)
    return
  }

  const { data: deletedPayment, error: fetchDeletedError } = await supabase
    .from('payments')
    .select('for_month')
    .eq('id', paymentId)
    .single()
  if (fetchDeletedError) throw fetchDeletedError

  const { error: deleteError } = await supabase.from('payments').delete().eq('id', paymentId)
  if (deleteError) throw deleteError

  if (deletedPayment.for_month !== currentMonthForMonth()) return

  const [{ data: tenantRow, error: tenantError }, { data: remaining, error: fetchError }] = await Promise.all([
    supabase.from('tenants').select('rent').eq('id', tenantId).single(),
    supabase.from('payments').select('amount').eq('tenant_id', tenantId).eq('for_month', currentMonthForMonth()),
  ])
  if (tenantError) throw tenantError
  if (fetchError) throw fetchError

  const total = (remaining ?? []).reduce((sum, p) => sum + p.amount, 0)
  const status: RentStatus = total <= 0 ? 'pending' : total >= tenantRow.rent ? 'paid' : 'partial'

  const { error: updateError } = await supabase.from('tenants').update({ rent_status: status }).eq('id', tenantId)
  if (updateError) throw updateError
}
