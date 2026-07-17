import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Fab } from '@/components/common/fab'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { useExpenses } from '@/features/expenses/hooks/use-expenses'
import { ExpenseListItem } from '@/features/expenses/components/expense-list-item'
import { AddExpenseSheet } from '@/features/expenses/components/add-expense-sheet'
import { deleteExpense } from '@/features/expenses/services/expenses.service'
import { expenseCategoryOptions, type Expense } from '@/features/expenses/types'
import { usePageTitle } from '@/hooks/use-page-title'

export function ExpensesPage() {
  usePageTitle('Expenses')
  const queryClient = useQueryClient()
  const { data: expenses, isLoading, isError, refetch } = useExpenses()
  const [addOpen, setAddOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [search, setSearch] = useState('')

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return expenses ?? []
    return (expenses ?? []).filter((e) => {
      const label = expenseCategoryOptions.find((o) => o.value === e.category)?.label ?? e.category
      return label.toLowerCase().includes(query) || (e.description ?? '').toLowerCase().includes(query)
    })
  }, [expenses, search])

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      toast.success('Expense deleted')
      setDeletingExpense(null)
    },
    onError: () => toast.error('Could not delete expense. Please try again.'),
  })

  return (
    <>
      <PullToRefresh onRefresh={refetch}>
        <div className="space-y-4">
          {expenses && expenses.length > 0 ? (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by category or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          ) : null}

          {isError ? (
            <ErrorState title="Couldn't load expenses" description="Please try again." onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : !expenses || expenses.length === 0 ? (
            <EmptyState icon={Wallet} title="No expenses yet" description="Add your first expense to start tracking costs." />
          ) : filteredExpenses.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description="Try a different search." />
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((expense) => (
                <ExpenseListItem
                  key={expense.id}
                  expense={expense}
                  onEdit={() => setEditingExpense(expense)}
                  onDelete={() => setDeletingExpense(expense)}
                />
              ))}
            </div>
          )}

          <AddExpenseSheet open={addOpen} onOpenChange={setAddOpen} />
          <AddExpenseSheet
            open={editingExpense !== null}
            onOpenChange={(open) => !open && setEditingExpense(null)}
            existingExpense={editingExpense}
          />

          <ConfirmSheet
            open={deletingExpense !== null}
            onOpenChange={(open) => !open && setDeletingExpense(null)}
            title="Delete this expense?"
            description="This can't be undone."
            confirmLabel="Delete"
            isPending={deleteMutation.isPending}
            onConfirm={() => {
              if (deletingExpense) deleteMutation.mutate(deletingExpense.id)
            }}
          />
        </div>
      </PullToRefresh>

      <Fab onClick={() => setAddOpen(true)}>
        <Plus className="size-6" />
      </Fab>
    </>
  )
}
