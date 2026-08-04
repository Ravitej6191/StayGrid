import { isDemoSession } from '@/config/env'
import { supabase } from '@/lib/supabase'
import { getDemoDb } from '@/lib/demo-store'
import { dateOnlyIso, monthKey as monthKeyOf, monthKeyOfDateString as monthKey } from '@/utils/format'
import type { DashboardData, DashboardRange, IncomeExpenseTrendPoint } from '../types'

function currentMonthKey(): string {
  return monthKeyOf(new Date())
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(year!, (month ?? 1) - 1, 1).toLocaleString('en-IN', { month: 'short' })
}

const dayIso = dateOnlyIso

function dayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year!, (month ?? 1) - 1, day ?? 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Every month key from the earliest activity date through the current
 * month, so the "all time" chart shows the full history instead of a fixed
 * window. */
function allMonthKeysSince(earliestDate: string | null): string[] {
  const now = new Date()
  const nowKey = monthKeyOf(now)
  if (!earliestDate) return [nowKey]

  const [startYear, startMonth] = earliestDate.slice(0, 7).split('-').map(Number)
  const start = new Date(startYear!, (startMonth ?? 1) - 1, 1)
  const keys: string[] = []
  const cursor = new Date(start)
  while (monthKeyOf(cursor) <= nowKey) {
    keys.push(monthKeyOf(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return keys.length > 0 ? keys : [nowKey]
}

/** Every calendar day from `daysBack` days ago (inclusive) through today. */
function dayKeysBack(daysBack: number): string[] {
  const keys: string[] = []
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - (daysBack - 1))
  for (let i = 0; i < daysBack; i++) {
    keys.push(dayIso(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

/** Every calendar day from the 1st of the current month through today. */
function dayKeysThisMonth(): string[] {
  const now = new Date()
  const keys: string[] = []
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1)
  while (cursor <= now) {
    keys.push(dayIso(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

/** Earliest date the trend needs to look back to, for a given range —
 * bounds how much history demo-store filters/Supabase queries need to
 * fetch. Returns null for 'all', which has no fixed lower bound. */
function rangeStartDate(range: DashboardRange): string | null {
  const now = new Date()
  if (range === 'week') return dayIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
  if (range === 'fortnight') return dayIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14))
  if (range === 'month') return dayIso(new Date(now.getFullYear(), now.getMonth(), 1))
  return null
}

function getDemoData(range: DashboardRange): DashboardData {
  const db = getDemoDb()
  const nowKey = currentMonthKey()

  const paymentsThisMonth = db.payments.filter((p) => monthKey(p.paymentDate) === nowKey)
  const thisMonthTotal = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0)

  const activeTenants = db.tenants.filter((t) => t.status === 'active')
  const pendingRent = activeTenants
    .filter((t) => t.rentStatus === 'pending')
    .reduce((sum, t) => sum + t.rent, 0)

  const expensesThisMonth = db.expenses.filter((e) => monthKey(e.expenseDate) === nowKey)
  const monthlyExpense = expensesThisMonth.reduce((sum, e) => sum + e.amount, 0)

  const occupiedBeds = db.beds.filter((b) => b.status === 'occupied').length
  const totalBeds = db.beds.length
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const vacantCount = totalBeds - occupiedBeds

  const pendingDepositsCount = activeTenants.filter((t) => !t.depositRecord).length

  let trend: IncomeExpenseTrendPoint[]
  if (range === 'all') {
    const earliestDate = [...db.payments.map((p) => p.paymentDate), ...db.expenses.map((e) => e.expenseDate)].sort()[0] ?? null
    trend = allMonthKeysSince(earliestDate).map((key) => ({
      label: monthLabel(key),
      income: db.payments.filter((p) => monthKey(p.paymentDate) === key).reduce((s, p) => s + p.amount, 0),
      expenses: db.expenses.filter((e) => monthKey(e.expenseDate) === key).reduce((s, e) => s + e.amount, 0),
    }))
  } else {
    const dayKeys = range === 'week' ? dayKeysBack(7) : range === 'fortnight' ? dayKeysBack(15) : dayKeysThisMonth()
    trend = dayKeys.map((key) => ({
      label: dayLabel(key),
      income: db.payments.filter((p) => p.paymentDate === key).reduce((s, p) => s + p.amount, 0),
      expenses: db.expenses.filter((e) => e.expenseDate === key).reduce((s, e) => s + e.amount, 0),
    }))
  }

  return {
    stats: {
      incomeThisMonth: thisMonthTotal,
      pendingRent,
      monthlyExpense,
      occupancyPercent,
      vacantCount,
      pendingDepositsCount,
    },
    trend,
  }
}

function startOfMonthIso(offsetMonths = 0): string {
  const d = new Date()
  d.setMonth(d.getMonth() + offsetMonths, 1)
  return dayIso(d)
}

async function fetchFromSupabase(range: DashboardRange): Promise<DashboardData> {
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

  const sum = (rows: { amount: number }[] | null) => (rows ?? []).reduce((s, r) => s + r.amount, 0)

  // Tenant ids are needed up front to scope the payments queries below (the
  // payments table has no building_id column of its own — it's reached only
  // through tenant_id — so fetching this first, rather than in parallel,
  // avoids relying solely on RLS for building isolation).
  const { data: tenantRows, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, rent, rent_status, status, deposit_paid_amount')
    .eq('building_id', buildingRow.id)
  if (tenantsError) throw tenantsError
  const tenantIds = tenantRows.map((t) => t.id)
  // .in('tenant_id', []) is unreliable across PostgREST versions when the
  // list is empty, so short-circuit to an empty result instead.
  const noPayments = () => Promise.resolve({ data: [] as never[], error: null })

  const [monthPayments, monthExpenses, bedCountResult, occupiedBedCountResult] = await Promise.all([
    tenantIds.length > 0
      ? supabase.from('payments').select('amount').in('tenant_id', tenantIds).gte('payment_date', startOfMonthIso())
      : noPayments(),
    supabase
      .from('expenses')
      .select('amount')
      .eq('building_id', buildingRow.id)
      .gte('expense_date', startOfMonthIso()),
    supabase.from('beds').select('id', { count: 'exact', head: true }),
    supabase.from('beds').select('id', { count: 'exact', head: true }).eq('status', 'occupied'),
  ])

  const activeTenants = tenantRows.filter((t) => t.status === 'active')
  const pendingRent = activeTenants
    .filter((t) => t.rent_status === 'pending')
    .reduce((s, t) => s + t.rent, 0)
  const pendingDepositsCount = activeTenants.filter((t) => t.deposit_paid_amount === null).length

  const thisMonthTotal = sum(monthPayments.data)
  const monthlyExpense = sum(monthExpenses.data)
  const totalBeds = bedCountResult.count ?? 0
  const occupiedBeds = occupiedBedCountResult.count ?? 0
  const occupancyPercent = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  // The window the trend chart needs to fetch data for — a fixed lookback
  // for week/fortnight/month, or "since the earliest record" for all time.
  let windowStart = rangeStartDate(range)
  if (range === 'all') {
    const [earliestPayment, earliestExpense] = await Promise.all([
      tenantIds.length > 0
        ? supabase.from('payments').select('payment_date').in('tenant_id', tenantIds).order('payment_date', { ascending: true }).limit(1)
        : noPayments(),
      supabase
        .from('expenses')
        .select('expense_date')
        .eq('building_id', buildingRow.id)
        .order('expense_date', { ascending: true })
        .limit(1),
    ])
    windowStart =
      [earliestPayment.data?.[0]?.payment_date, earliestExpense.data?.[0]?.expense_date]
        .filter((d): d is string => Boolean(d))
        .sort()[0] ?? null
  }

  const [windowPayments, windowExpenses] = await Promise.all([
    tenantIds.length > 0
      ? (() => {
          let q = supabase.from('payments').select('amount, payment_date').in('tenant_id', tenantIds)
          if (windowStart) q = q.gte('payment_date', windowStart)
          return q
        })()
      : Promise.resolve({ data: [] as { amount: number; payment_date: string }[], error: null }),
    (() => {
      let q = supabase.from('expenses').select('amount, expense_date').eq('building_id', buildingRow.id)
      if (windowStart) q = q.gte('expense_date', windowStart)
      return q
    })(),
  ])
  if (windowPayments.error) throw windowPayments.error
  if (windowExpenses.error) throw windowExpenses.error

  const payments = windowPayments.data ?? []
  const expenses = windowExpenses.data ?? []

  let trend: IncomeExpenseTrendPoint[]
  if (range === 'all') {
    const keys = allMonthKeysSince(windowStart)
    trend = keys.map((key) => ({
      label: monthLabel(key),
      income: payments.filter((p) => monthKey(p.payment_date) === key).reduce((s, p) => s + p.amount, 0),
      expenses: expenses.filter((e) => monthKey(e.expense_date) === key).reduce((s, e) => s + e.amount, 0),
    }))
  } else {
    const dayKeys = range === 'week' ? dayKeysBack(7) : range === 'fortnight' ? dayKeysBack(15) : dayKeysThisMonth()
    trend = dayKeys.map((key) => ({
      label: dayLabel(key),
      income: payments.filter((p) => p.payment_date === key).reduce((s, p) => s + p.amount, 0),
      expenses: expenses.filter((e) => e.expense_date === key).reduce((s, e) => s + e.amount, 0),
    }))
  }

  return {
    stats: {
      incomeThisMonth: thisMonthTotal,
      pendingRent,
      monthlyExpense,
      occupancyPercent,
      vacantCount: totalBeds - occupiedBeds,
      pendingDepositsCount,
    },
    trend,
  }
}

export async function getDashboardData(range: DashboardRange = 'all'): Promise<DashboardData> {
  if (isDemoSession()) {
    return getDemoData(range)
  }
  return fetchFromSupabase(range)
}
