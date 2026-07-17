import { useQuery } from '@tanstack/react-query'
import { getOnboardingStatus } from '../services/onboarding.service'

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['onboarding', 'status'],
    queryFn: getOnboardingStatus,
  })
}
