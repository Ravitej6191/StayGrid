import { useQuery } from '@tanstack/react-query'
import { getBuildingData } from '../services/building.service'

export function useBuildingData() {
  return useQuery({
    queryKey: ['building', 'full'],
    queryFn: getBuildingData,
  })
}
