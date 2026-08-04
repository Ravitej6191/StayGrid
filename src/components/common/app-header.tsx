import { useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft } from 'lucide-react'
import { usePageHeaderStore } from '@/store/page-header-store'
import { useUnreadNotificationCount } from '@/features/notifications/hooks/use-notifications'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/providers/auth-provider'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export function AppHeader() {
  const navigate = useNavigate()
  const title = usePageHeaderStore((s) => s.title)
  const onBack = usePageHeaderStore((s) => s.onBack)
  const action = usePageHeaderStore((s) => s.action)
  const { data: unreadCount } = useUnreadNotificationCount()
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex items-center gap-1.5 border-b border-border/80 bg-card/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="press-scale -ml-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
      ) : null}
      <h1 className="flex-1 truncate py-3 text-base font-semibold tracking-tight text-foreground">{title}</h1>
      {action}
      <button
        type="button"
        onClick={() => navigate('/notifications')}
        aria-label="Notifications"
        className="press-scale relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell className="size-4" />
        {unreadCount ? (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-card motion-safe:animate-pulse" />
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => navigate('/settings')}
        aria-label="Profile"
        className="press-scale -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full"
      >
        <Avatar className="size-7 ring-2 ring-border/60 transition-shadow hover:ring-primary/40">
          {user?.photoUrl ? <AvatarImage src={user.photoUrl} alt={user.name} referrerPolicy="no-referrer" /> : null}
          <AvatarFallback className="text-[11px]">{user ? initials(user.name) : ''}</AvatarFallback>
        </Avatar>
      </button>
    </header>
  )
}
