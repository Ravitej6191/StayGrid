import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center', className)}
    >
      <div className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-primary/12 to-muted/40 text-primary ring-1 ring-border/60">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-lg" aria-hidden="true" />
        <Icon className="relative size-7" strokeWidth={1.75} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </motion.div>
  )
}
