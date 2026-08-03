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
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  neutral: 'bg-muted text-muted-foreground',
}

export function StatCard({ icon: Icon, label, value, tone = 'neutral' }: StatCardProps) {
  return (
    <Card className="press-scale min-w-0 gap-1.5 p-3 transition-transform duration-200 hover:-translate-y-0.5">
      <div className={cn('flex size-7 items-center justify-center rounded-lg', toneClasses[tone])}>
        <Icon className="size-3.5" />
      </div>
      <p className="font-numeric truncate text-sm font-semibold tracking-tight text-foreground" title={value}>
        {value}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
    </Card>
  )
}
