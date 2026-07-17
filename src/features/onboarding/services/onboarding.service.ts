import { isSupabaseConfigured } from '@/config/env'
import { supabase } from '@/lib/supabase'
import { clearDemoDb, getDemoDb, seedFromOnboarding, updateBuildingProfile } from '@/lib/demo-store'
import type { OnboardingInput } from '../types'

export async function getOnboardingStatus(): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return getDemoDb().settings.onboardingCompleted
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('settings')
    .select('onboarding_completed')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (error) throw error

  return data?.onboarding_completed ?? false
}

async function upsertProfileToSupabase(input: OnboardingInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error: buildingError } = await supabase.from('building').upsert(
    {
      owner_id: user.id,
      name: input.buildingName,
      property_type: input.propertyType,
      address: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      contact_phone: input.phone,
      gst_number: input.gstNumber,
      pan_number: input.panNumber,
    },
    { onConflict: 'owner_id' },
  )
  if (buildingError) throw buildingError

  const { error: settingsError } = await supabase.from('settings').upsert(
    {
      owner_id: user.id,
      owner_name: input.ownerName,
      onboarding_completed: true,
    },
    { onConflict: 'owner_id' },
  )
  if (settingsError) throw settingsError
}

export async function completeOnboarding(input: OnboardingInput): Promise<void> {
  if (!isSupabaseConfigured) {
    seedFromOnboarding(input)
    return
  }
  await upsertProfileToSupabase(input)
}

/** Updates building/owner profile fields without touching the existing
 * floors/rooms/tenants — used by the Settings "edit profile" flow. */
export async function updateProfile(input: OnboardingInput): Promise<void> {
  if (!isSupabaseConfigured) {
    updateBuildingProfile({
      name: input.buildingName,
      propertyType: input.propertyType,
      address: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      contactPhone: input.phone,
      gstNumber: input.gstNumber,
      panNumber: input.panNumber,
      ownerName: input.ownerName,
    })
    return
  }
  await upsertProfileToSupabase(input)
}

/** Wipes the owner's building, tenants, payments, and every other record —
 * used by "Clear App Data" and "Delete Account" in Settings. */
export async function clearAccountData(): Promise<void> {
  if (!isSupabaseConfigured) {
    clearDemoDb()
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error: buildingError } = await supabase.from('building').delete().eq('owner_id', user.id)
  if (buildingError) throw buildingError

  const { error: settingsError } = await supabase.from('settings').delete().eq('owner_id', user.id)
  if (settingsError) throw settingsError
}
