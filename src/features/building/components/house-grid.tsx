import { motion } from 'motion/react'
import { HouseCard } from './house-card'
import type { House } from '../types'

interface HouseGridProps {
  houses: House[]
  onSelectHouse: (houseId: string) => void
}

export function HouseGrid({ houses, onSelectHouse }: HouseGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {houses.map((house) => (
        <HouseCard key={house.id} house={house} onSelect={() => onSelectHouse(house.id)} />
      ))}
    </motion.div>
  )
}
