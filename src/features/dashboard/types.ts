export interface DashboardStats {
  incomeThisMonth: number
  pendingRent: number
  monthlyExpense: number
  occupancyPercent: number
  vacantCount: number
  complaintsCount: number
}

export interface IncomeExpenseTrendPoint {
  month: string
  income: number
  expenses: number
}

export interface DashboardData {
  stats: DashboardStats
  trend: IncomeExpenseTrendPoint[]
}
