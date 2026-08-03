import { Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { RoomCard } from './room-card'
import type { Room } from '../types'

interface RoomGridProps {
  rooms: Room[]
  onSelectRoom: (roomId: string) => void
  onAddRoom: () => void
}

export function RoomGrid({ rooms, onSelectRoom, onAddRoom }: RoomGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} onSelect={() => onSelectRoom(room.id)} />
      ))}
      <button
        type="button"
        onClick={onAddRoom}
        className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2.5 text-primary transition-colors hover:bg-accent"
      >
        <Plus className="size-4" />
        <span className="text-[11px] font-medium">Add Room</span>
      </button>
    </motion.div>
  )
}
