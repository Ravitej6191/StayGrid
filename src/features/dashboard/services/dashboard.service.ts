import { isDemoSession } from '@/config/env'
import { supabase } from '@/lib/supabase'
import { getDemoDb } from '@/lib/demo-store'
import { monthKey as monthKeyOf, monthKeyOfDateString as monthKey } from '@/utils/format'
import type { DashboardData, IncomeExpenseTrendPoint } from '../types'

function currentMonthKey(): string {
  return monthKeyOf(new Date())
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(year!, (month ?? 1) - 1, 1).toLocaleString('en-IN', { month: 'short' })
}

/** Every month key from the earliest activity date through the current
 * month, so the chart shows the full history instead of a fixed window. */
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

function getDemoData(): DashboardData {
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

  const earliestDate = [...db.payments.map((p) => p.paymentDate), ...db.expenses.map((e) => e.expenseDate)].sort()[0] ?? null
  const months = allMonthKeysSince(earliestDate)
  const trend: IncomeExpenseTrendPoint[] = months.map((key) => ({
    month: monthLabel(key),
    income: db.payments.filter((p) => monthKey(p.paymentDate) === key).reduce((s, p) => s + p.amount, 0),
    expenses: db.expenses.filter((e) => monthKey(e.expenseDate) === key).reduce((s, e) => s + e.amount, 0),
  }))

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
  return d.toISOString().slice(0, 10)
}

async function fetchFromSupabase(): Promise<DashboardData> {
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

  const [monthPayments, monthExpenses, bedCountResult, occupiedBedCountResult, earliestPayment, earliestExpense] =
    await Promise.all([
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

  const earliestDate = [earliestPayment.data?.[0]?.payment_date, earliestExpense.data?.[0]?.expense_date]
    .filter((d): d is string => Boolean(d))
    .sort()[0] ?? null
  const months = allMonthKeysSince(earliestDate)

  const trend: IncomeExpenseTrendPoint[] = []
  for (const key of months) {
    const [year, month] = key.split('-').map(Number)
    const from = new Date(year!, (month ?? 1) - 1, 1).toISOString().slice(0, 10)
    const to = new Date(year!, month ?? 1, 1).toISOString().slice(0, 10)
    const [inc, exp] = await Promise.all([
      tenantIds.length > 0
        ? supabase.from('payments').select('amount').in('tenant_id', tenantIds).gte('payment_date', from).lt('payment_date', to)
        : noPayments(),
      supabase
        .from('expenses')
        .select('amount')
        .eq('building_id', buildingRow.id)
        .gte('expense_date', from)
        .lt('expense_date', to),
    ])
    trend.push({
      month: monthLabel(key),
      income: sum(inc.data),
      expenses: sum(exp.data),
    })
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

export async function getDashboardData(): Promise<DashboardData> {
  if (isDemoSession()) {
    return getDemoData()
  }
  return fetchFromSupabase()
}
