import { isDemoSession } from '@/config/env'
import { supabase } from '@/lib/supabase'
import {
  clearAllNotifications as demoClearAllNotifications,
  getNotifications as demoGetNotifications,
  markAllNotificationsRead as demoMarkAllNotificationsRead,
  type DemoNotification,
  type NotificationType,
} from '@/lib/demo-store'

export type { DemoNotification as AppNotification }

export async function getNotifications(): Promise<DemoNotification[]> {
  if (isDemoSession()) {
    return demoGetNotifications()
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

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, message, read, created_at')
    .eq('building_id', buildingRow.id)
    .order('created_at', { ascending: false })
  if (error) throw error

  return data.map((n) => ({
    id: n.id,
    type: n.type as NotificationType,
    title: n.title,
    message: n.message,
    createdAt: n.created_at,
    read: n.read,
  }))
}

export async function clearAllNotifications(): Promise<void> {
  if (isDemoSession()) {
    demoClearAllNotifications()
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

  const { error } = await supabase.from('notifications').delete().eq('building_id', buildingRow.id)
  if (error) throw error
}

export async function markAllNotificationsRead(): Promise<void> {
  if (isDemoSession()) {
    demoMarkAllNotificationsRead()
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
    .from('notifications')
    .update({ read: true })
    .eq('building_id', buildingRow.id)
    .eq('read', false)
  if (error) throw error
}

/** Called from the real-Supabase branch of other feature services (tenants,
 * expenses, broadcast) to log an event to the bell feed — mirrors what
 * demo-store's mutators do internally via `pushNotification`. This is a
 * side-effect of the calling mutation, not the mutation itself, so a
 * failure here is swallowed (logged) rather than thrown — the tenant/
 * payment/expense/broadcast the caller just committed must not get
 * reported as failed just because the notification log didn't write. */
export async function pushSupabaseNotification(
  buildingId: string,
  type: NotificationType,
  title: string,
  message: string,
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({ building_id: buildingId, type, title, message })
  if (error) console.error('[notifications] failed to log notification:', error.message)
}
