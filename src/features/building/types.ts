import type { HouseType, PropertyType } from '@/types/database.types'
import type { Tenant } from '@/types/domain'
import type { OccupancyStatus } from '@/constants/status'

export interface House {
  id: string
  floorId: string
  houseNumber: string
  houseType: HouseType
  gasConnectionNumber: string | null
  electricityBillNumber: string | null
  /** A house holds at most one active tenant. */
  tenant: Tenant | null
  occupancyStatus: OccupancyStatus
  hasRentPending: boolean
}

/** Purely descriptive — a house holds exactly one tenant regardless of type. */
export const houseTypeOptions: { value: HouseType; label: string }[] = [
  { value: '1bhk', label: '1BHK' },
  { value: '2bhk', label: '2BHK' },
  { value: '3bhk', label: '3BHK' },
]

export function houseTypeLabel(houseType: HouseType): string {
  return houseTypeOptions.find((o) => o.value === houseType)?.label ?? houseType
}

export interface Floor {
  id: string
  buildingId: string
  floorNumber: number
  name: string
  houses: House[]
}

export interface BuildingSummary {
  id: string
  name: string
  ownerName: string
  propertyType: PropertyType
  address: string
  city: string
  state: string
  pincode: string
  contactPhone: string
  contactEmail: string
  totalFloors: number
  totalHouses: number
}
