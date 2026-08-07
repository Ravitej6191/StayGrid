import type { LenderType } from '@/types/database.types'

export type { LenderType }

export interface Loan {
  id: string
  lenderType: LenderType
  lenderName: string | null
  amount: number
  interestNote: string | null
  takenOn: string
  takenTill: string | null
  notes: string | null
  paidTillNow: number
  stillToPay: number
  createdAt: string
}

export interface LoanRepayment {
  id: string
  loanId: string
  amount: number
  paymentDate: string
  notes: string | null
  createdAt: string
}

export const lenderTypeOptions: { value: LenderType; label: string }[] = [
  { value: 'bank', label: 'Bank' },
  { value: 'society', label: 'Society' },
  { value: 'dwakara', label: 'Dwakara' },
  { value: 'hand_cash', label: 'Hand Cash' },
  { value: 'gold_loan', label: 'Gold Loan' },
  { value: 'other', label: 'Other' },
]

export function lenderTypeLabel(lenderType: LenderType): string {
  return lenderTypeOptions.find((o) => o.value === lenderType)?.label ?? lenderType
}
