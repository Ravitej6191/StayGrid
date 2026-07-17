import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../services/dashboard.service'

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardData,
  })
}
