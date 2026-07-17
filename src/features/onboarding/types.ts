import type { PropertyType } from '@/types/database.types'

export type { PropertyType }

export interface OnboardingInput {
  propertyType: PropertyType
  buildingName: string
  address: string
  city: string
  state: string
  pincode: string
  ownerName: string
  phone: string
  gstNumber: string | null
  panNumber: string | null
}

