import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDateTime } from '@/utils/format'
import type { Tenant } from '@/types/domain'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

const formatDate = formatDateTime

export function PastTenantListItem({ tenant }: { tenant: Tenant }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/tenants/${tenant.id}`)}
      className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card/80 p-3 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-sm"
    >
      <Avatar className="size-11">
        <AvatarFallback>{initials(tenant.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{tenant.name}</p>
        <p className="text-xs text-muted-foreground">
          {tenant.roomNumber ? `${tenant.floorName} · Room ${tenant.roomNumber}` : 'Was never allocated'}
        </p>
      </div>
      <p className="text-right text-xs text-muted-foreground">
        {formatDate(tenant.joiningDate)}
        <br />
        {tenant.vacatingDate ? formatDate(tenant.vacatingDate) : '—'}
      </p>
    </button>
  )
}
