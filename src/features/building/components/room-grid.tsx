import { motion } from 'motion/react'
import { RoomCard } from './room-card'
import type { Room } from '../types'

export function RoomGrid({ rooms, onSelectRoom }: { rooms: Room[]; onSelectRoom: (roomId: string) => void }) {
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
    </motion.div>
  )
}
