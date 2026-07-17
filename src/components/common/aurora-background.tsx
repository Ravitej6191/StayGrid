import { motion } from 'motion/react'

/** Fixed, full-viewport gradient-mesh backdrop with very minimal drift.
 * Colors come from semantic tokens so it adapts across light/dark themes. */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <motion.div
        className="absolute -top-32 -left-24 size-96 rounded-full bg-primary/20 blur-3xl"
        animate={{ x: [0, 12, 0], y: [0, 8, 0] }}
        transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 size-[28rem] rounded-full bg-info/15 blur-3xl"
        animate={{ x: [0, -10, 0], y: [0, -8, 0] }}
        transition={{ duration: 55, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-24 left-1/4 size-96 rounded-full bg-success/12 blur-3xl"
        animate={{ x: [0, 8, 0], y: [0, -6, 0] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/70" />
    </div>
  )
}
