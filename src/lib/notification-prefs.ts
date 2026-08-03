export const NOTIFICATIONS_ENABLED_KEY = 'staygrid.notificationsEnabled'

/** Whether the in-app notification feed (bell icon) should receive new
 * entries. Read fresh on every push so the Settings toggle takes effect
 * immediately without a reload. */
export function areNotificationsEnabled(): boolean {
  return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) !== 'false'
}
