import { isSupabaseConfigured } from '@/config/env'
import { supabase } from '@/lib/supabase'
import { getDemoDb } from '@/lib/demo-store'
import type { DashboardData, IncomeExpenseTrendPoint } from '../types'

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // YYYY-MM
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(year!, (month ?? 1) - 1, 1).toLocaleString('en-IN', { month: 'short' })
}

function lastSixMonthKeys(): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
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

  const complaintsCount = db.maintenance.filter((m) => m.status === 'open' || m.status === 'in_progress').length

  const months = lastSixMonthKeys()
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
      complaintsCount,
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

  const [monthPayments, monthExpenses, tenants, bedCountResult, complaintsResult] = await Promise.all([
    supabase.from('payments').select('amount').gte('payment_date', startOfMonthIso()),
    supabase
      .from('expenses')
      .select('amount')
      .eq('building_id', buildingRow.id)
      .gte('expense_date', startOfMonthIso()),
    supabase.from('tenants').select('id, rent, rent_status, status'),
    supabase.from('beds').select('id', { count: 'exact', head: true }),
    supabase.from('maintenance').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
  ])

  const activeTenants = (tenants.data ?? []).filter((t) => t.status === 'active')
  const pendingRent = activeTenants
    .filter((t) => t.rent_status === 'pending')
    .reduce((s, t) => s + t.rent, 0)

  const thisMonthTotal = sum(monthPayments.data)
  const monthlyExpense = sum(monthExpenses.data)
  const totalBeds = bedCountResult.count ?? 0
  const occupancyPercent = totalBeds ? Math.round((activeTenants.length / totalBeds) * 100) : 0

  const trend: IncomeExpenseTrendPoint[] = []
  for (let i = 5; i >= 0; i--) {
    const from = startOfMonthIso(-i)
    const to = startOfMonthIso(-i + 1)
    const [inc, exp] = await Promise.all([
      supabase.from('payments').select('amount').gte('payment_date', from).lt('payment_date', to),
      supabase
        .from('expenses')
        .select('amount')
        .eq('building_id', buildingRow.id)
        .gte('expense_date', from)
        .lt('expense_date', to),
    ])
    trend.push({
      month: new Date(from).toLocaleString('en-IN', { month: 'short' }),
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
      vacantCount: totalBeds - activeTenants.length,
      complaintsCount: complaintsResult.count ?? 0,
    },
    trend,
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured) {
    return getDemoData()
  }
  return fetchFromSupabase()
}
