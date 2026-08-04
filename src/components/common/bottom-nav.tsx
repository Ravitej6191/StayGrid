import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { bottomNavItems } from '@/constants/nav'
import { cn } from '@/lib/utils'

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/85 shadow-[0_-8px_24px_-12px_rgb(0_0_0_/_0.15)] backdrop-blur-lg md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[calc(env(safe-area-inset-bottom))]">
        {bottomNavItems.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className="group relative flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground transition-colors"
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId="bottom-nav-active"
                      className="absolute bottom-0 h-1 w-8 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  ) : null}
                  <motion.span
                    animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <item.icon
                      className={cn('size-5 transition-colors', isActive && 'text-primary')}
                      strokeWidth={isActive ? 2.25 : 2}
                    />
                  </motion.span>
                  <span className={cn('transition-colors', isActive && 'font-semibold text-primary')}>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
