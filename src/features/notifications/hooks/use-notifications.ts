import { useQuery } from '@tanstack/react-query'
import { getNotifications } from '../services/notifications.service'

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    select: (data) => data.filter((n) => !n.read).length,
  })
}
