import type { BedStatus, PropertyType, RoomType } from '@/types/database.types'
import type { Tenant } from '@/types/domain'
import type { OccupancyStatus } from '@/constants/status'

export interface Bed {
  id: string
  roomId: string
  bedLabel: string
  status: BedStatus
  tenant: Tenant | null
}

export interface Room {
  id: string
  floorId: string
  roomNumber: string
  roomType: RoomType
  capacity: number
  beds: Bed[]
  occupiedCount: number
  vacantCount: number
  occupancyStatus: OccupancyStatus
  hasRentPending: boolean
  hasMaintenance: boolean
}

/** Room type determines bed capacity directly except Dorm, where the owner
 * enters an arbitrary bed count. */
export const roomTypeOptions: { value: RoomType; label: string; capacity: number | null }[] = [
  { value: 'single', label: 'Single', capacity: 1 },
  { value: 'twin', label: 'Twin Sharing', capacity: 2 },
  { value: 'sharing_3', label: '3 Sharing', capacity: 3 },
  { value: 'sharing_4', label: '4 Sharing', capacity: 4 },
  { value: 'sharing_5', label: '5 Sharing', capacity: 5 },
  { value: 'sharing_6', label: '6 Sharing', capacity: 6 },
  { value: 'sharing_7', label: '7 Sharing', capacity: 7 },
  { value: 'sharing_8', label: '8 Sharing', capacity: 8 },
  { value: 'dorm', label: 'Dorm', capacity: null },
]

export function roomTypeLabel(roomType: RoomType): string {
  return roomTypeOptions.find((o) => o.value === roomType)?.label ?? roomType
}

export interface Floor {
  id: string
  buildingId: string
  floorNumber: number
  name: string
  rooms: Room[]
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
  gstNumber: string | null
  panNumber: string | null
  totalFloors: number
  totalRooms: number
  totalBeds: number
}
