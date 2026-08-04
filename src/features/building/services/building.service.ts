import { isDemoSession } from '@/config/env'
import { supabase } from '@/lib/supabase'
import {
  addFloor as demoAddFloor,
  addRoom as demoAddRoom,
  deleteFloor as demoDeleteFloor,
  deleteRoom as demoDeleteRoom,
  getDemoDb,
  resolveTenant,
  updateFloor as demoUpdateFloor,
  updateRoom as demoUpdateRoom,
  type AddFloorInput,
  type AddRoomInput,
  type UpdateRoomInput,
} from '@/lib/demo-store'
import type { TenantRow } from '@/types/database.types'
import type { Tenant } from '@/types/domain'
import type { OccupancyStatus } from '@/constants/status'
import type { Bed, BuildingSummary, Floor, Room } from '../types'

export interface BuildingData {
  building: BuildingSummary
  floors: Floor[]
}

function deriveRoomFlags(beds: Bed[]): {
  occupiedCount: number
  vacantCount: number
  occupancyStatus: OccupancyStatus
  hasRentPending: boolean
} {
  const occupiedCount = beds.filter((b) => b.status === 'occupied').length
  const vacantCount = beds.filter((b) => b.status === 'vacant').length
  const hasRentPending = beds.some((b) => b.tenant?.rentStatus === 'pending')

  let occupancyStatus: OccupancyStatus = 'vacant'
  if (occupiedCount > 0 && occupiedCount === beds.length) occupancyStatus = 'occupied'
  else if (occupiedCount > 0) occupancyStatus = 'partial'

  return { occupiedCount, vacantCount, occupancyStatus, hasRentPending }
}

function getDemoData(): BuildingData {
  const db = getDemoDb()

  const floors: Floor[] = db.floors
    .slice()
    .sort((a, b) => a.floorNumber - b.floorNumber)
    .map((floor) => {
      const rooms: Room[] = db.rooms
        .filter((r) => r.floorId === floor.id)
        .map((room) => {
          const beds: Bed[] = db.beds
            .filter((b) => b.roomId === room.id)
            .map((bed) => {
              const demoTenant = db.tenants.find((t) => t.bedId === bed.id && t.status === 'active')
              return {
                id: bed.id,
                roomId: bed.roomId,
                bedLabel: bed.bedLabel,
                status: bed.status,
                tenant: demoTenant ? resolveTenant(db, demoTenant) : null,
              }
            })
          return {
            id: room.id,
            floorId: room.floorId,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            capacity: room.capacity,
            beds,
            ...deriveRoomFlags(beds),
          }
        })
      return { id: floor.id, buildingId: floor.buildingId, floorNumber: floor.floorNumber, name: floor.name, rooms }
    })

  const building: BuildingSummary = {
    id: db.building.id,
    name: db.building.name,
    ownerName: db.settings.ownerName ?? '',
    propertyType: db.building.propertyType,
    address: db.building.address,
    city: db.building.city,
    state: db.building.state,
    pincode: db.building.pincode,
    contactPhone: db.building.contactPhone,
    contactEmail: db.building.contactEmail,
    gstNumber: db.building.gstNumber,
    panNumber: db.building.panNumber,
    totalFloors: floors.length,
    totalRooms: db.rooms.length,
    totalBeds: db.beds.length,
  }

  return { building, floors }
}

// ---- Real Supabase path (scaffolded; not yet exercised until connected) ----

function mapTenantRow(row: TenantRow, roomId: string, roomNumber: string, floorName: string): Tenant {
  return {
    id: row.id,
    bedId: row.bed_id,
    roomId,
    roomNumber,
    floorName,
    name: row.name,
    phone: row.phone,
    email: row.email,
    aadhaarNumber: row.aadhaar_number,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    address: row.address,
    occupation: row.occupation,
    company: row.company,
    bloodGroup: row.blood_group,
    photoUrl: row.photo_url,
    joiningDate: row.joining_date,
    vacatingDate: row.vacating_date,
    advance: row.advance,
    deposit: row.deposit,
    rent: row.rent,
    rentStatus: row.rent_status,
    status: row.status,
    notes: row.notes,
    depositRecord:
      row.deposit_paid_amount !== null
        ? {
            amount: row.deposit_paid_amount,
            paidDate: row.deposit_paid_date ?? '',
            screenshotUrl: row.deposit_screenshot_url,
            recordedAt: row.deposit_recorded_at ?? row.deposit_paid_date ?? '',
          }
        : null,
  }
}

async function fetchFromSupabase(): Promise<BuildingData> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: buildingRow, error: buildingError } = await supabase
    .from('building')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (buildingError) throw buildingError
  if (!buildingRow) throw new Error('No building found for this account')

  const { data: settingsRow, error: settingsError } = await supabase
    .from('settings')
    .select('owner_name')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (settingsError) throw settingsError

  const { data: floorRows, error: floorsError } = await supabase
    .from('floors')
    .select('*')
    .eq('building_id', buildingRow.id)
    .order('floor_number', { ascending: true })
  if (floorsError) throw floorsError

  const floorIds = floorRows.map((f) => f.id)
  const { data: roomRows, error: roomsError } = await supabase
    .from('rooms')
    .select('*')
    .in('floor_id', floorIds)
    .order('room_number', { ascending: true })
  if (roomsError) throw roomsError

  const roomIds = roomRows.map((r) => r.id)
  const { data: bedRows, error: bedsError } = await supabase
    .from('beds')
    .select('*')
    .in('room_id', roomIds)
    .order('bed_label', { ascending: true })
  if (bedsError) throw bedsError

  const bedIds = bedRows.map((b) => b.id)
  const { data: tenantRows, error: tenantsError } = await supabase
    .from('tenants')
    .select('*')
    .in('bed_id', bedIds)
    .eq('status', 'active')
  if (tenantsError) throw tenantsError

  const roomNumberById = new Map(roomRows.map((r) => [r.id, r.room_number]))
  const floorNameById = new Map(floorRows.map((f) => [f.id, f.name]))
  const roomIdByBedId = new Map(bedRows.map((b) => [b.id, b.room_id]))
  const floorIdByRoomId = new Map(roomRows.map((r) => [r.id, r.floor_id]))

  const tenantByBedId = new Map(
    tenantRows
      .filter((t): t is TenantRow & { bed_id: string } => t.bed_id !== null)
      .map((t) => {
        const roomId = roomIdByBedId.get(t.bed_id) ?? ''
        const floorId = floorIdByRoomId.get(roomId)
        const roomNumber = roomNumberById.get(roomId) ?? ''
        const floorName = (floorId && floorNameById.get(floorId)) || ''
        return [t.bed_id, mapTenantRow(t, roomId, roomNumber, floorName)] as const
      }),
  )

  const bedsByRoomId = new Map<string, Bed[]>()
  for (const bedRow of bedRows) {
    const bed: Bed = {
      id: bedRow.id,
      roomId: bedRow.room_id,
      bedLabel: bedRow.bed_label,
      // The 'maintenance' bed status has no UI path that can ever set it —
      // nothing writes it, so treat it as vacant if it's ever found (e.g.
      // set manually in the DB) rather than surfacing a status the app has
      // no way to display or clear.
      status: bedRow.status === 'occupied' ? 'occupied' : 'vacant',
      tenant: tenantByBedId.get(bedRow.id) ?? null,
    }
    const list = bedsByRoomId.get(bedRow.room_id) ?? []
    list.push(bed)
    bedsByRoomId.set(bedRow.room_id, list)
  }

  const roomsByFloorId = new Map<string, Room[]>()
  for (const roomRow of roomRows) {
    const beds = bedsByRoomId.get(roomRow.id) ?? []
    const room: Room = {
      id: roomRow.id,
      floorId: roomRow.floor_id,
      roomNumber: roomRow.room_number,
      roomType: roomRow.room_type,
      capacity: roomRow.capacity,
      beds,
      ...deriveRoomFlags(beds),
    }
    const list = roomsByFloorId.get(roomRow.floor_id) ?? []
    list.push(room)
    roomsByFloorId.set(roomRow.floor_id, list)
  }

  const floors: Floor[] = floorRows.map((f) => ({
    id: f.id,
    buildingId: f.building_id,
    floorNumber: f.floor_number,
    name: f.name,
    rooms: roomsByFloorId.get(f.id) ?? [],
  }))

  const building: BuildingSummary = {
    id: buildingRow.id,
    name: buildingRow.name,
    ownerName: settingsRow?.owner_name ?? '',
    propertyType: buildingRow.property_type,
    address: buildingRow.address ?? '',
    city: buildingRow.city ?? '',
    state: buildingRow.state ?? '',
    pincode: buildingRow.pincode ?? '',
    contactPhone: buildingRow.contact_phone ?? '',
    contactEmail: buildingRow.contact_email ?? '',
    gstNumber: buildingRow.gst_number,
    panNumber: buildingRow.pan_number,
    totalFloors: floors.length,
    totalRooms: roomRows.length,
    totalBeds: bedRows.length,
  }

  return { building, floors }
}

export async function getBuildingData(): Promise<BuildingData> {
  if (isDemoSession()) {
    return getDemoData()
  }
  return fetchFromSupabase()
}

export async function createFloor(input: AddFloorInput): Promise<void> {
  if (isDemoSession()) {
    demoAddFloor(input)
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: buildingRow, error: buildingError } = await supabase
    .from('building')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (buildingError) throw buildingError

  const { error } = await supabase
    .from('floors')
    .insert({ building_id: buildingRow.id, floor_number: input.floorNumber, name: input.name })
  if (error) throw error
}

export async function updateFloor(floorId: string, name: string): Promise<void> {
  if (isDemoSession()) {
    demoUpdateFloor(floorId, name)
    return
  }

  const { error } = await supabase.from('floors').update({ name }).eq('id', floorId)
  if (error) throw error
}

export async function deleteFloor(floorId: string): Promise<void> {
  if (isDemoSession()) {
    demoDeleteFloor(floorId)
    return
  }

  const { data: rooms, error: roomsError } = await supabase.from('rooms').select('id').eq('floor_id', floorId)
  if (roomsError) throw roomsError
  const roomIds = rooms.map((r) => r.id)

  if (roomIds.length > 0) {
    const { data: beds, error: bedsError } = await supabase.from('beds').select('id').in('room_id', roomIds)
    if (bedsError) throw bedsError
    const bedIds = beds.map((b) => b.id)

    if (bedIds.length > 0) {
      const { count, error: tenantsError } = await supabase
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .in('bed_id', bedIds)
        .eq('status', 'active')
      if (tenantsError) throw tenantsError
      if ((count ?? 0) > 0) throw new Error('Move or vacate tenants on this floor before deleting it.')
    }
  }

  const { error } = await supabase.from('floors').delete().eq('id', floorId)
  if (error) throw error
}

export async function createRoom(input: AddRoomInput): Promise<void> {
  if (isDemoSession()) {
    demoAddRoom(input)
    return
  }

  const { data: roomRow, error: roomError } = await supabase
    .from('rooms')
    .insert({
      floor_id: input.floorId,
      room_number: input.roomNumber,
      room_type: input.roomType,
      capacity: input.capacity,
    })
    .select('id')
    .single()
  if (roomError) throw roomError

  const bedsToInsert = Array.from({ length: input.capacity }, (_, i) => ({
    room_id: roomRow.id,
    bed_label: String.fromCharCode(65 + i),
    status: 'vacant' as const,
  }))
  const { error: bedsError } = await supabase.from('beds').insert(bedsToInsert)
  if (bedsError) throw bedsError
}

export async function updateRoom(input: UpdateRoomInput): Promise<void> {
  if (isDemoSession()) {
    demoUpdateRoom(input)
    return
  }

  const { data: existingBeds, error: bedsError } = await supabase
    .from('beds')
    .select('id, status, bed_label')
    .eq('room_id', input.id)
    .order('bed_label', { ascending: true })
  if (bedsError) throw bedsError

  if (input.capacity > existingBeds.length) {
    let maxIndex = -1
    for (const bed of existingBeds) {
      const index = bed.bed_label.charCodeAt(0) - 65
      if (index > maxIndex) maxIndex = index
    }
    const nextLabelStart = maxIndex + 1
    const bedsToInsert = Array.from({ length: input.capacity - existingBeds.length }, (_, i) => ({
      room_id: input.id,
      bed_label: String.fromCharCode(65 + nextLabelStart + i),
      status: 'vacant' as const,
    }))
    const { error: insertError } = await supabase.from('beds').insert(bedsToInsert)
    if (insertError) throw insertError
  } else if (input.capacity < existingBeds.length) {
    const removeCount = existingBeds.length - input.capacity
    const removableBeds = existingBeds.filter((b) => b.status === 'vacant')
    if (removableBeds.length < removeCount) {
      throw new Error('Vacate tenants before reducing the bed count.')
    }
    const idsToRemove = removableBeds.slice(0, removeCount).map((b) => b.id)
    const { error: deleteError } = await supabase.from('beds').delete().in('id', idsToRemove)
    if (deleteError) throw deleteError
  }

  const { error } = await supabase
    .from('rooms')
    .update({
      room_number: input.roomNumber,
      room_type: input.roomType,
      capacity: input.capacity,
    })
    .eq('id', input.id)
  if (error) throw error
}

export async function deleteRoom(roomId: string): Promise<void> {
  if (isDemoSession()) {
    demoDeleteRoom(roomId)
    return
  }

  const { count, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, beds!inner(room_id)', { count: 'exact', head: true })
    .eq('beds.room_id', roomId)
    .eq('status', 'active')
  if (tenantsError) throw tenantsError
  if ((count ?? 0) > 0) throw new Error('Move or vacate tenants in this room before deleting it.')

  const { error } = await supabase.from('rooms').delete().eq('id', roomId)
  if (error) throw error
}
