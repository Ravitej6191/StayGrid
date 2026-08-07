import { useQuery } from '@tanstack/react-query'
import { getLoanRepayments, getLoans } from '../services/loans.service'

export function useLoans() {
  return useQuery({
    queryKey: ['loans', 'list'],
    queryFn: getLoans,
  })
}

export function useLoanRepayments(loanId: string | undefined) {
  return useQuery({
    queryKey: ['loans', 'repayments', loanId],
    queryFn: () => getLoanRepayments(loanId!),
    enabled: Boolean(loanId),
  })
}
