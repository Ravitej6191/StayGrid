import {
  clearAllNotifications as demoClearAllNotifications,
  getNotifications as demoGetNotifications,
  markAllNotificationsRead as demoMarkAllNotificationsRead,
  type DemoNotification,
} from '@/lib/demo-store'

export type { DemoNotification as AppNotification }

/** No real notifications table exists yet — entries are logged locally by
 * the other feature mutators so the flow is fully demoable and ready to
 * wire to a real backend later. */
export async function getNotifications(): Promise<DemoNotification[]> {
  return demoGetNotifications()
}

export async function clearAllNotifications(): Promise<void> {
  demoClearAllNotifications()
}

export async function markAllNotificationsRead(): Promise<void> {
  demoMarkAllNotificationsRead()
}
