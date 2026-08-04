export interface DashboardStats {
  incomeThisMonth: number
  pendingRent: number
  monthlyExpense: number
  occupancyPercent: number
  vacantCount: number
  pendingDepositsCount: number
}

export interface IncomeExpenseTrendPoint {
  label: string
  income: number
  expenses: number
}

export type DashboardRange = 'week' | 'fortnight' | 'month' | 'all'

export interface DashboardData {
  stats: DashboardStats
  trend: IncomeExpenseTrendPoint[]
}
