import {
  Flame,
  Hammer,
  Lightbulb,
  Milk,
  Pencil,
  Sofa,
  Sparkles,
  Trash2,
  Users,
  Utensils,
  Wallet,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { Expense, ExpenseCategory } from '../types'

const iconByCategory: Record<ExpenseCategory, LucideIcon> = {
  food: Utensils,
  groceries: Wallet,
  milk: Milk,
  vegetables: Wallet,
  gas: Flame,
  electricity: Lightbulb,
  internet: Wifi,
  cleaning: Sparkles,
  repairs: Hammer,
  furniture: Sofa,
  salary: Users,
  misc: Wallet,
}

const colorByCategory: Record<ExpenseCategory, string> = {
  food: 'bg-orange-500/10 text-orange-500',
  groceries: 'bg-emerald-500/10 text-emerald-500',
  milk: 'bg-sky-500/10 text-sky-500',
  vegetables: 'bg-green-500/10 text-green-600',
  gas: 'bg-red-500/10 text-red-500',
  electricity: 'bg-yellow-500/10 text-yellow-600',
  internet: 'bg-blue-500/10 text-blue-500',
  cleaning: 'bg-cyan-500/10 text-cyan-500',
  repairs: 'bg-amber-500/10 text-amber-600',
  furniture: 'bg-purple-500/10 text-purple-500',
  salary: 'bg-indigo-500/10 text-indigo-500',
  misc: 'bg-slate-500/10 text-slate-500',
}

interface ExpenseListItemProps {
  expense: Expense
  onEdit: () => void
  onDelete: () => void
}

export function ExpenseListItem({ expense, onEdit, onDelete }: ExpenseListItemProps) {
  const Icon = iconByCategory[expense.category]

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${colorByCategory[expense.category]}`}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground capitalize">{expense.category}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDateTime(expense.createdAt)}
            {expense.description ? ` · ${expense.description}` : ''}
          </p>
        </div>
      </div>
      <p className="font-numeric text-sm font-semibold text-foreground">{formatCurrency(expense.amount)}</p>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit expense"
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete expense"
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}
