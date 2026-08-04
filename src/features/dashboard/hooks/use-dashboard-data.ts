import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../services/dashboard.service'
import type { DashboardRange } from '../types'

export function useDashboardData(range: DashboardRange = 'all') {
  return useQuery({
    queryKey: ['dashboard', 'summary', range],
    queryFn: () => getDashboardData(range),
  })
}
