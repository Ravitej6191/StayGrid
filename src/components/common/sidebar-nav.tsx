import { NavLink } from 'react-router-dom'
import { bottomNavItems } from '@/constants/nav'
import { cn } from '@/lib/utils'

export function SidebarNav() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card px-3 py-6 md:flex">
      <ul className="flex flex-col gap-1">
        {bottomNavItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  )
}
