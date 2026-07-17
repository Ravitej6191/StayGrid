import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useOnboardingStatus } from '@/features/onboarding/hooks/use-onboarding-status'

export function OnboardingGate() {
  const { data: isOnboarded, isLoading } = useOnboardingStatus()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
