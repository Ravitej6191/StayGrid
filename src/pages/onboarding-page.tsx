import { Navigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { AuroraBackground } from '@/components/common/aurora-background'
import { OnboardingForm } from '@/features/onboarding/components/onboarding-form'
import { useOnboardingStatus } from '@/features/onboarding/hooks/use-onboarding-status'

export function OnboardingPage() {
  const { data: isOnboarded, isLoading } = useOnboardingStatus()

  if (!isLoading && isOnboarded) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="relative min-h-svh overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10 flex min-h-svh flex-col px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">StayGrid</p>
            <p className="text-xs text-muted-foreground">Set up your property</p>
          </div>
        </div>
        <OnboardingForm />
      </div>
    </div>
  )
}
