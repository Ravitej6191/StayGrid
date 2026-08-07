import { isDemoSession } from '@/config/env'
import { supabase } from '@/lib/supabase'
import { clearDemoDb, getDemoDb, seedFromOnboarding, updateBuildingProfile } from '@/lib/demo-store'
import type { OnboardingInput } from '../types'

export async function getOnboardingStatus(): Promise<boolean> {
  if (isDemoSession()) {
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
  if (isDemoSession()) {
    seedFromOnboarding(input)
    return
  }
  await upsertProfileToSupabase(input)
}

/** Lets a user past the onboarding gate without filling the form — building
 * name is the only column the DB actually requires, everything else can be
 * filled in later from Settings. */
export async function skipOnboarding(): Promise<void> {
  await completeOnboarding({
    propertyType: 'pg',
    buildingName: 'My Property',
    address: '',
    city: '',
    state: '',
    pincode: '',
    ownerName: '',
    phone: '',
  })
}

/** Updates building/owner profile fields without touching the existing
 * floors/houses/tenants — used by the Settings "edit profile" flow. */
export async function updateProfile(input: OnboardingInput): Promise<void> {
  if (isDemoSession()) {
    updateBuildingProfile({
      name: input.buildingName,
      propertyType: input.propertyType,
      address: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      contactPhone: input.phone,
      ownerName: input.ownerName,
    })
    return
  }
  await upsertProfileToSupabase(input)
}

/** Wipes everything the owner has entered since onboarding — floors, houses,
 * tenants, payments, expenses, and every other operational record — but
 * keeps the building profile and `onboarding_completed` flag intact, so a
 * Google-authenticated owner isn't sent back through onboarding just to
 * clear their data. Used by "Clear App Data" in Settings (real backend only
 * — demo mode clears everything via logout instead, see auth-provider). */
export async function clearAppData(): Promise<void> {
  // Runs as a single Postgres transaction (see migration 0003) so a failure
  // partway through can't leave the account half-wiped.
  const { error } = await supabase.rpc('clear_app_data')
  if (error) throw error
}

/** Permanently deletes the owner's building, settings, and (via cascade)
 * every record tied to them — used by "Delete Account" in Settings. */
export async function clearAccountData(): Promise<void> {
  if (isDemoSession()) {
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
