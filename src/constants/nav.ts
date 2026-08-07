import { Building2, HandCoins, LayoutDashboard, Settings, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const bottomNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/building', label: 'Building', icon: Building2 },
  { to: '/loans', label: 'Loans', icon: HandCoins },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
]
