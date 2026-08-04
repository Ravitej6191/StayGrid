import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Bell, IndianRupee, ListX, Megaphone, UserPlus, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { useNotifications } from '@/features/notifications/hooks/use-notifications'
import { clearAllNotifications, markAllNotificationsRead } from '@/features/notifications/services/notifications.service'
import type { NotificationType } from '@/lib/demo-store'
import { usePageTitle } from '@/hooks/use-page-title'
import { usePageHeaderAction } from '@/hooks/use-page-header-action'

const typeIcons: Record<NotificationType, LucideIcon> = {
  tenant: UserPlus,
  payment: IndianRupee,
  expense: Wallet,
  broadcast: Megaphone,
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  usePageTitle('Notifications', onBack)
  const queryClient = useQueryClient()
  const { data: notifications, isLoading, isError, refetch } = useNotifications()

  useEffect(() => {
    if (notifications && notifications.some((n) => !n.read)) {
      void markAllNotificationsRead().then(() => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications])

  const clearMutation = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notifications cleared')
    },
    onError: () => toast.error('Could not clear notifications. Please try again.'),
  })

  usePageHeaderAction(
    notifications && notifications.length > 0 ? (
      <button
        type="button"
        onClick={() => clearMutation.mutate()}
        disabled={clearMutation.isPending}
        aria-label="Clear all notifications"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
      >
        <ListX className="size-4" />
      </button>
    ) : null,
  )

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-4">
        {isError ? (
          <ErrorState title="Couldn't load notifications" description="Please try again." onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="Activity like new tenants, payments, and broadcasts will show up here." />
        ) : (
          <>
            <div className="space-y-2">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type]
                return (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/80 p-3.5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-foreground">{notification.title}</p>
                        {!notification.read ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  )
}
