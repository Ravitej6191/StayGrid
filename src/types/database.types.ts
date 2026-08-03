/**
 * Hand-written mirror of supabase/migrations/0001_init.sql. Once a real
 * Supabase project exists, this can be regenerated with
 * `supabase gen types typescript` and dropped in as a straight replacement —
 * shapes below intentionally match what that codegen would produce.
 */

export type PropertyType = 'pg' | 'co_living' | 'building' | 'residency' | 'apartment'
export type RoomType =
  | 'single'
  | 'twin'
  | 'sharing_3'
  | 'sharing_4'
  | 'sharing_5'
  | 'sharing_6'
  | 'sharing_7'
  | 'sharing_8'
  | 'dorm'
export type BedStatus = 'vacant' | 'occupied' | 'maintenance'
export type TenantStatus = 'active' | 'vacated'
export type RentStatus = 'paid' | 'partial' | 'pending' | 'advance'
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque'
export type ExpenseCategory =
  | 'food'
  | 'groceries'
  | 'milk'
  | 'vegetables'
  | 'gas'
  | 'electricity'
  | 'internet'
  | 'cleaning'
  | 'repairs'
  | 'furniture'
  | 'salary'
  | 'misc'
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'
export type MaintenanceStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type InventoryCategory =
  | 'kitchen'
  | 'furniture'
  | 'cleaning'
  | 'appliances'
  | 'gas_cylinders'
  | 'mattresses'
  | 'beds'
  | 'fans'
  | 'buckets'
  | 'water_cans'
  | 'misc'

export type BuildingRow = {
  id: string
  owner_id: string
  name: string
  property_type: PropertyType
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  contact_phone: string | null
  contact_email: string | null
  gst_number: string | null
  pan_number: string | null
  created_at: string
  updated_at: string
}

export type FloorRow = {
  id: string
  building_id: string
  floor_number: number
  name: string
  created_at: string
}

export type RoomRow = {
  id: string
  floor_id: string
  room_number: string
  room_type: RoomType
  capacity: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type BedRow = {
  id: string
  room_id: string
  bed_label: string
  status: BedStatus
  created_at: string
}

export type TenantRow = {
  id: string
  building_id: string
  bed_id: string | null
  name: string
  phone: string
  email: string | null
  aadhaar_number: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  address: string | null
  occupation: string | null
  company: string | null
  blood_group: string | null
  photo_url: string | null
  joining_date: string
  vacating_date: string | null
  advance: number
  deposit: number
  rent: number
  rent_status: RentStatus
  status: TenantStatus
  notes: string | null
  deposit_paid_amount: number | null
  deposit_paid_date: string | null
  deposit_screenshot_url: string | null
  deposit_recorded_at: string | null
  created_at: string
  updated_at: string
}

export type PaymentRow = {
  id: string
  tenant_id: string
  amount: number
  payment_date: string
  payment_mode: PaymentMode
  for_month: string
  late_fee: number
  discount: number
  status: RentStatus
  receipt_number: string | null
  receipt_url: string | null
  notes: string | null
  created_at: string
}

export type ExpenseRow = {
  id: string
  building_id: string
  category: ExpenseCategory
  amount: number
  expense_date: string
  description: string | null
  invoice_url: string | null
  created_at: string
}

export type MaintenanceRow = {
  id: string
  room_id: string
  title: string
  description: string | null
  priority: MaintenancePriority
  status: MaintenanceStatus
  vendor_name: string | null
  cost: number | null
  invoice_url: string | null
  photos: string[]
  completion_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InventoryRow = {
  id: string
  building_id: string
  category: InventoryCategory
  item_name: string
  quantity: number
  low_stock_threshold: number
  unit: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type DocumentRow = {
  id: string
  tenant_id: string
  doc_type: string
  file_url: string
  uploaded_at: string
}

export type ActivityRow = {
  id: string
  building_id: string
  entity_type: string
  entity_id: string | null
  activity_type: string
  description: string
  metadata: Record<string, unknown>
  created_at: string
}

export type NotificationRow = {
  id: string
  building_id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}

export type BroadcastRow = {
  id: string
  building_id: string
  message: string
  image_url: string | null
  audience: string
  recipient_count: number
  delivered_count: number
  created_at: string
}

export type SettingsRow = {
  id: string
  owner_id: string
  owner_name: string | null
  onboarding_completed: boolean
  theme: 'light' | 'dark' | 'system'
  notifications_enabled: boolean
  rent_reminder_days_before: number
  currency: string
  created_at: string
  updated_at: string
}

type TableDef<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      building: TableDef<BuildingRow>
      floors: TableDef<FloorRow>
      rooms: TableDef<RoomRow>
      beds: TableDef<BedRow>
      tenants: TableDef<TenantRow>
      payments: TableDef<PaymentRow>
      expenses: TableDef<ExpenseRow>
      maintenance: TableDef<MaintenanceRow>
      inventory: TableDef<InventoryRow>
      documents: TableDef<DocumentRow>
      activities: TableDef<ActivityRow>
      notifications: TableDef<NotificationRow>
      broadcasts: TableDef<BroadcastRow>
      settings: TableDef<SettingsRow>
    }
    Views: { [_ in never]: never }
    Functions: {
      clear_app_data: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
