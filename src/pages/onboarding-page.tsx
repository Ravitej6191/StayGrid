import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AuroraBackground } from '@/components/common/aurora-background'
import { Button } from '@/components/ui/button'
import { OnboardingForm } from '@/features/onboarding/components/onboarding-form'
import { useOnboardingStatus } from '@/features/onboarding/hooks/use-onboarding-status'
import { skipOnboarding } from '@/features/onboarding/services/onboarding.service'

export function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: isOnboarded, isLoading } = useOnboardingStatus()
  const [isSkipping, setIsSkipping] = useState(false)

  if (!isLoading && isOnboarded) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSkip = async () => {
    setIsSkipping(true)
    try {
      await skipOnboarding()
      await queryClient.invalidateQueries({ queryKey: ['onboarding', 'status'] })
      navigate('/dashboard', { replace: true })
    } catch {
      toast.error('Could not skip setup. Please try again.')
      setIsSkipping(false)
    }
  }

  return (
    <div className="relative min-h-svh overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10 flex min-h-svh flex-col px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-foreground">StayGrid</p>
              <p className="text-xs text-muted-foreground">Set up your property</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSkip} disabled={isSkipping}>
            {isSkipping ? <Loader2 className="size-4 animate-spin" /> : 'Skip for now'}
          </Button>
        </div>
        <OnboardingForm />
      </div>
    </div>
  )
}
