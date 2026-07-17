import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { AppHeader } from '@/components/common/app-header'
import { BottomNav } from '@/components/common/bottom-nav'
import { SidebarNav } from '@/components/common/sidebar-nav'
import { WelcomeDrawer } from '@/components/common/welcome-drawer'
import { useExitConfirm } from '@/hooks/use-exit-confirm'

export function AppLayout() {
  const location = useLocation()
  useExitConfirm()

  return (
    <div className="flex min-h-svh bg-background">
      <SidebarNav />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col md:mx-0">
        <AppHeader />
        <main className="flex-1 overflow-x-hidden px-4 pt-4 pb-24 md:px-8 md:pt-6 md:pb-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
        <BottomNav />
      </div>
      <WelcomeDrawer />
    </div>
  )
}
