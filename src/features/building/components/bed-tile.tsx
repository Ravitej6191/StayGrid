import { Wrench } from 'lucide-react'
import { bedStatusTokens } from '@/constants/status'
import { cn } from '@/lib/utils'
import type { Bed } from '../types'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function BedTile({ bed, onSelect }: { bed: Bed; onSelect: () => void }) {
  const token = bedStatusTokens[bed.status]

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/70 px-2 py-3 text-center transition-all hover:-translate-y-0.5 hover:bg-accent/50 hover:shadow-sm"
    >
      <span
        className={cn(
          'flex size-10 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-offset-2 ring-offset-card',
          token.badge,
          bed.status === 'occupied' ? 'ring-success/30' : bed.status === 'maintenance' ? 'ring-info/30' : 'ring-transparent',
        )}
      >
        {bed.status === 'maintenance' ? (
          <Wrench className="size-4" />
        ) : bed.tenant ? (
          initials(bed.tenant.name)
        ) : (
          bed.bedLabel
        )}
      </span>
      <span className="max-w-full truncate text-[11px] font-medium text-foreground">
        {bed.tenant ? bed.tenant.name : `Bed ${bed.bedLabel}`}
      </span>
      <span className="text-[10px] text-muted-foreground">{token.label}</span>
    </button>
  )
}
