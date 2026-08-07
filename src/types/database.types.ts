/**
 * Hand-written mirror of supabase/migrations/0001_init.sql. Once a real
 * Supabase project exists, this can be regenerated with
 * `supabase gen types typescript` and dropped in as a straight replacement —
 * shapes below intentionally match what that codegen would produce.
 */

export type PropertyType = 'pg' | 'co_living' | 'building' | 'residency' | 'apartment'
export type HouseType = '1bhk' | '2bhk' | '3bhk'
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
export type LenderType = 'bank' | 'society' | 'dwakara' | 'hand_cash' | 'gold_loan' | 'other'
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

export type HouseRow = {
  id: string
  floor_id: string
  house_number: string
  house_type: HouseType
  gas_connection_number: string | null
  electricity_bill_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type TenantRow = {
  id: string
  building_id: string
  house_id: string | null
  name: string
  phone: string
  aadhaar_number: string | null
  address: string | null
  occupation: string | null
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

export type LoanRow = {
  id: string
  building_id: string
  lender_type: LenderType
  lender_name: string | null
  amount: number
  interest_note: string | null
  taken_on: string
  taken_till: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type LoanRepaymentRow = {
  id: string
  loan_id: string
  amount: number
  payment_date: string
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
  invoice_urls: string[]
  created_at: string
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
      houses: TableDef<HouseRow>
      tenants: TableDef<TenantRow>
      payments: TableDef<PaymentRow>
      loans: TableDef<LoanRow>
      loan_repayments: TableDef<LoanRepaymentRow>
      expenses: TableDef<ExpenseRow>
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
