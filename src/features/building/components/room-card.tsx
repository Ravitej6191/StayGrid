import { BedDouble } from 'lucide-react'
import { motion } from 'motion/react'
import { occupancyStatusTokens } from '@/constants/status'
import { cn } from '@/lib/utils'
import { roomTypeLabel } from '../types'
import type { Room } from '../types'

export function RoomCard({ room, onSelect }: { room: Room; onSelect: () => void }) {
  const token = occupancyStatusTokens[room.occupancyStatus]

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={cn('absolute inset-x-0 top-0 h-1', token.dot)} />

      <div>
        <p className="text-base font-semibold text-foreground">{room.roomNumber}</p>
        <p className="text-xs text-muted-foreground">{roomTypeLabel(room.roomType)}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap',
            token.badge,
          )}
        >
          <span className={cn('size-1.5 shrink-0 rounded-full', token.dot)} />
          {token.label}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <BedDouble className="size-3.5" />
          {room.occupiedCount}/{room.beds.length}
        </span>
      </div>
    </motion.button>
  )
}
