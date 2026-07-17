import type { ExpenseCategory } from '@/types/database.types'

export type { ExpenseCategory }

export interface Expense {
  id: string
  category: ExpenseCategory
  amount: number
  expenseDate: string
  description: string | null
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
