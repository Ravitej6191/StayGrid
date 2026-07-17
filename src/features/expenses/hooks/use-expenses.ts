import { useQuery } from '@tanstack/react-query'
import { getExpenses } from '../services/expenses.service'

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses', 'list'],
    queryFn: getExpenses,
  })
}
