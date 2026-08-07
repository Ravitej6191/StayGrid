import type { ExpenseCategory } from '@/types/database.types'

export type { ExpenseCategory }

export interface Expense {
  id: string
  category: ExpenseCategory
  amount: number
  expenseDate: string
  description: string | null
  imageUrls: string[]
  /** When this expense was actually recorded — distinct from `expenseDate`,
   * which the user can backdate. Carries the real time of day. */
  createdAt: string
}

export const expenseCategoryOptions: { value: ExpenseCategory; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'milk', label: 'Milk' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'gas', label: 'Gas' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'internet', label: 'Internet' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'salary', label: 'Salary' },
  { value: 'misc', label: 'Others' },
]
