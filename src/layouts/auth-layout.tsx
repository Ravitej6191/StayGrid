import { Outlet } from 'react-router-dom'
import { AuroraBackground } from '@/components/common/aurora-background'

export function AuthLayout() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-12">
      <AuroraBackground />
      <div className="relative z-10 w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}
