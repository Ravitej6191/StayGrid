import { isSupabaseConfigured } from '@/config/env'
import { supabase } from '@/lib/supabase'
import {
  addExpense as demoAddExpense,
  deleteExpense as demoDeleteExpense,
  getDemoDb,
  updateExpense as demoUpdateExpense,
  type AddExpenseInput,
  type UpdateExpenseInput,
} from '@/lib/demo-store'
import type { Expense } from '../types'

export async function getExpenses(): Promise<Expense[]> {
  if (!isSupabaseConfigured) {
    return getDemoDb()
      .expenses.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        expenseDate: e.expenseDate,
        description: e.description,
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
    .select('id, category, amount, expense_date, description')
    .eq('building_id', buildingRow.id)
    .order('expense_date', { ascending: false })
  if (error) throw error

  return data.map((e) => ({
    id: e.id,
    category: e.category,
    amount: e.amount,
    expenseDate: e.expense_date,
    description: e.description,
  }))
}

export type CreateExpenseInput = AddExpenseInput

export async function createExpense(input: CreateExpenseInput): Promise<void> {
  if (!isSupabaseConfigured) {
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
  })
  if (error) throw error
}

export type EditExpenseInput = UpdateExpenseInput

export async function updateExpense(input: EditExpenseInput): Promise<void> {
  if (!isSupabaseConfigured) {
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
    })
    .eq('id', input.id)
  if (error) throw error
}

export async function deleteExpense(expenseId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demoDeleteExpense(expenseId)
    return
  }

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
  if (error) throw error
}
