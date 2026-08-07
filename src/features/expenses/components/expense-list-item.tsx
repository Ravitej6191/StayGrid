import {
  Flame,
  Hammer,
  ImageIcon,
  Lightbulb,
  Milk,
  Sofa,
  Sparkles,
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
  onSelect: () => void
}

export function ExpenseListItem({ expense, onSelect }: ExpenseListItemProps) {
  const Icon = iconByCategory[expense.category]

  return (
    <button
      type="button"
      onClick={onSelect}
      className="press-scale group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-all duration-200 ease-[var(--ease-out-smooth)] hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 ${colorByCategory[expense.category]}`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground capitalize">{expense.category}</p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          {formatDateTime(expense.createdAt)}
          {expense.description ? ` · ${expense.description}` : ''}
          {expense.imageUrls.length > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground/80">
              <ImageIcon className="size-3" />
              {expense.imageUrls.length}
            </span>
          ) : null}
        </p>
      </div>
      <p className="font-numeric text-sm font-semibold text-foreground">{formatCurrency(expense.amount)}</p>
    </button>
  )
}
