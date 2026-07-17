import { useQuery } from '@tanstack/react-query'
import { getTenants } from '../services/tenants.service'

export function useTenants() {
  return useQuery({
    queryKey: ['tenants', 'list'],
    queryFn: getTenants,
  })
}
