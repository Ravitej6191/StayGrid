import { isDemoSession } from '@/config/env'
import { supabase } from '@/lib/supabase'
import {
  addExpense as demoAddExpense,
  deleteExpense as demoDeleteExpense,
  getDemoDb,
  updateExpense as demoUpdateExpense,
  type AddExpenseInput,
  type UpdateExpenseInput,
} from '@/lib/demo-store'
import { pushSupabaseNotification } from '@/features/notifications/services/notifications.service'
import { formatCurrency } from '@/utils/format'
import type { Expense } from '../types'

export async function getExpenses(): Promise<Expense[]> {
  if (isDemoSession()) {
    return getDemoDb()
      .expenses.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        expenseDate: e.expenseDate,
        description: e.description,
        imageUrls: e.imageUrls,
        createdAt: e.createdAt,
      }))
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
  }

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

  const { data, error } = await supabase
    .from('expenses')
    .select('id, category, amount, expense_date, description, invoice_urls, created_at')
    .eq('building_id', buildingRow.id)
    .order('expense_date', { ascending: false })
  if (error) throw error

  return data.map((e) => ({
    id: e.id,
    category: e.category,
    amount: e.amount,
    expenseDate: e.expense_date,
    description: e.description,
    imageUrls: e.invoice_urls,
    createdAt: e.created_at,
  }))
}

export type CreateExpenseInput = AddExpenseInput

export async function createExpense(input: CreateExpenseInput): Promise<void> {
  if (isDemoSession()) {
    demoAddExpense(input)
    return
  }

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

  const { error } = await supabase.from('expenses').insert({
    building_id: buildingRow.id,
    category: input.category,
    amount: input.amount,
    expense_date: input.expenseDate,
    description: input.description,
    invoice_urls: input.imageUrls,
  })
  if (error) throw error

  await pushSupabaseNotification(
    buildingRow.id,
    'expense',
    'Expense added',
    `${formatCurrency(input.amount)} expense recorded.`,
  )
}

export type EditExpenseInput = UpdateExpenseInput

export async function updateExpense(input: EditExpenseInput): Promise<void> {
  if (isDemoSession()) {
    demoUpdateExpense(input)
    return
  }

  const { error } = await supabase
    .from('expenses')
    .update({
      category: input.category,
      amount: input.amount,
      expense_date: input.expenseDate,
      description: input.description,
      invoice_urls: input.imageUrls,
    })
    .eq('id', input.id)
  if (error) throw error
}

export async function deleteExpense(expenseId: string): Promise<void> {
  if (isDemoSession()) {
    demoDeleteExpense(expenseId)
    return
  }

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
  if (error) throw error
}
