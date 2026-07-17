import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { bottomNavItems } from '@/constants/nav'
import { cn } from '@/lib/utils'

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/70 backdrop-blur-xl supports-backdrop-filter:bg-card/60 md:hidden">
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
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  ) : null}
                  <item.icon
                    className={cn('size-5 transition-colors', isActive && 'text-primary')}
                    strokeWidth={isActive ? 2.25 : 2}
                  />
                  <span className={cn(isActive && 'text-primary')}>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
