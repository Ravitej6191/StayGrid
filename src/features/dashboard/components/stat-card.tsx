import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: 'bg-primary/12 text-primary shadow-[0_0_0_1px_var(--color-primary)/8]',
  success: 'bg-success/12 text-success shadow-[0_0_0_1px_var(--color-success)/8]',
  warning: 'bg-warning/12 text-warning shadow-[0_0_0_1px_var(--color-warning)/8]',
  danger: 'bg-danger/12 text-danger shadow-[0_0_0_1px_var(--color-danger)/8]',
  info: 'bg-info/12 text-info shadow-[0_0_0_1px_var(--color-info)/8]',
  neutral: 'bg-muted text-muted-foreground',
}

const accentClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: 'from-primary/60 via-primary/20',
  success: 'from-success/60 via-success/20',
  warning: 'from-warning/60 via-warning/20',
  danger: 'from-danger/60 via-danger/20',
  info: 'from-info/60 via-info/20',
  neutral: 'from-neutral/40 via-neutral/10',
}

export function StatCard({ icon: Icon, label, value, tone = 'neutral' }: StatCardProps) {
  return (
    <Card
      className={cn(
        'group relative min-w-0 gap-1.5 overflow-hidden p-3.5 transition-all duration-300 ease-[var(--ease-out-smooth)]',
        'hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:scale-[0.98] active:duration-150'
      )}
    >
      <span
        aria-hidden="true"
        className={cn('absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r to-transparent', accentClasses[tone])}
      />
      <div
        className={cn(
          'flex size-8 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110',
          toneClasses[tone]
        )}
      >
        <Icon className="size-4" />
      </div>
      <p className="font-numeric truncate text-base font-semibold tracking-tight text-foreground" title={value}>
        {value}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
    </Card>
  )
}
