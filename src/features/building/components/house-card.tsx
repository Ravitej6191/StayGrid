import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { houseTypeLabel } from '../types'
import type { House } from '../types'

export function HouseCard({ house, onSelect }: { house: House; onSelect: () => void }) {
  const occupied = Boolean(house.tenant)

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-1 rounded-t-xl',
          occupied ? (house.hasRentPending ? 'bg-danger' : 'bg-success') : 'bg-border',
        )}
      />

      <div className="flex items-start justify-between gap-2 pt-0.5">
        <div>
          <p className="text-base font-semibold text-foreground">{house.houseNumber}</p>
          <p className="text-xs text-muted-foreground">{houseTypeLabel(house.houseType)}</p>
        </div>

        {house.tenant ? (
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110',
              house.hasRentPending ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success',
            )}
          >
            {house.hasRentPending ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          </span>
        ) : null}
      </div>
    </motion.button>
  )
}
