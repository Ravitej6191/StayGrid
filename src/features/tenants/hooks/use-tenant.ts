import { useQuery } from '@tanstack/react-query'
import { getPaymentHistory, getTenantById } from '../services/tenants.service'

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: ['tenants', 'detail', id],
    queryFn: () => getTenantById(id!),
    enabled: Boolean(id),
  })
}

export function usePaymentHistory(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenants', 'payments', tenantId],
    queryFn: () => getPaymentHistory(tenantId!),
    enabled: Boolean(tenantId),
  })
}
