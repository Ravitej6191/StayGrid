import { IndianRupee, Megaphone, UserPlus, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface QuickAction {
  icon: LucideIcon
  label: string
  onClick: () => void
}

interface QuickActionsProps {
  onRecordPayment: () => void
  onAddTenant: () => void
  onAddExpense: () => void
  onBroadcast: () => void
}

export function QuickActions({ onRecordPayment, onAddTenant, onAddExpense, onBroadcast }: QuickActionsProps) {
  const actions: QuickAction[] = [
    { icon: IndianRupee, label: 'Record Payment', onClick: onRecordPayment },
    { icon: UserPlus, label: 'Add Tenant', onClick: onAddTenant },
    { icon: Wallet, label: 'Add Expense', onClick: onAddExpense },
    { icon: Megaphone, label: 'Broadcast', onClick: onBroadcast },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-3 text-center transition-colors active:bg-accent"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <action.icon className="size-4" />
          </span>
          <span className="text-[11px] leading-tight font-medium text-foreground">{action.label}</span>
        </button>
      ))}
    </div>
  )
}
