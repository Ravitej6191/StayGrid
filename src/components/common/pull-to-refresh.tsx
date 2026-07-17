import { useEffect, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import { ArrowDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const THRESHOLD = 64
const MAX_PULL = 96

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown> | unknown
  children: ReactNode
  className?: string
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const y = useMotionValue(0)
  const [refreshing, setRefreshing] = useState(false)
  const [atTop, setAtTop] = useState(true)
  const rotate = useTransform(y, [0, THRESHOLD], [0, 180])
  const opacity = useTransform(y, [0, THRESHOLD / 2], [0, 1])

  useEffect(() => {
    const handleScroll = () => setAtTop(window.scrollY <= 0)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const settle = (target: number) => animate(y, target, { type: 'spring', stiffness: 300, damping: 30 })

  const handleDragEnd = () => {
    if (refreshing) return
    if (y.get() >= THRESHOLD) {
      setRefreshing(true)
      settle(40)
      void Promise.resolve(onRefresh()).finally(() => {
        setRefreshing(false)
        settle(0)
      })
    } else {
      settle(0)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <motion.div
        style={{ opacity }}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-1"
      >
        <span className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground shadow-sm">
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <motion.span style={{ rotate }} className="flex">
              <ArrowDown className="size-4" />
            </motion.span>
          )}
        </span>
      </motion.div>
      <motion.div
        drag={atTop && !refreshing ? 'y' : false}
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: MAX_PULL }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        style={{ y }}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  )
}
