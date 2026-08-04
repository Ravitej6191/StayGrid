import { cn } from '@/lib/utils'

interface StatusToken {
  label: string
  dot: string
  badge: string
}

export function StatusChip({ token, className }: { token: StatusToken; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium shadow-sm transition-colors',
        token.badge,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full shadow-[0_0_4px_currentColor]', token.dot)} />
      {token.label}
    </span>
  )
}
