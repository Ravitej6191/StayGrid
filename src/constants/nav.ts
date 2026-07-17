import { Building2, LayoutDashboard, Settings, Users, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const bottomNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/building', label: 'Building', icon: Building2 },
  { to: '/tenants', label: 'Tenants', icon: Users },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
]
