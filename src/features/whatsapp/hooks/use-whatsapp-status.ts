import { useQuery } from '@tanstack/react-query'
import { getWhatsAppStatus } from '../services/whatsapp.service'

export function useWhatsAppStatus(enabled: boolean) {
  return useQuery({
    queryKey: ['whatsapp', 'status'],
    queryFn: getWhatsAppStatus,
    enabled,
    refetchInterval: 2500,
    retry: false,
  })
}
