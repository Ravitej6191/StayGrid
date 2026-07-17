import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TimelineEntry {
  id: string
  icon: LucideIcon
  title: string
  timestamp: string
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

const toneClasses: Record<NonNullable<TimelineEntry['tone']>, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
  neutral: 'bg-muted text-muted-foreground',
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="space-y-0">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < entries.length - 1 ? (
            <span className="absolute top-8 left-4 h-[calc(100%-1.75rem)] w-px bg-border" aria-hidden />
          ) : null}
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full',
              toneClasses[entry.tone ?? 'neutral'],
            )}
          >
            <entry.icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-sm text-foreground">{entry.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{entry.timestamp}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
