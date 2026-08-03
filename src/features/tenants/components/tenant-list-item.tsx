import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatusChip } from '@/components/common/status-chip'
import { rentStatusTokens } from '@/constants/status'
import { formatCurrency } from '@/utils/format'
import type { Tenant } from '@/types/domain'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export function TenantListItem({ tenant }: { tenant: Tenant }) {
  const navigate = useNavigate()
  const rentToken = rentStatusTokens[tenant.rentStatus]

  return (
    <button
      type="button"
      onClick={() => navigate(`/tenants/${tenant.id}`)}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
    >
      <Avatar className="size-11">
        {tenant.photoUrl ? <AvatarImage src={tenant.photoUrl} alt={tenant.name} /> : null}
        <AvatarFallback>{initials(tenant.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{tenant.name}</p>
        <p className="text-xs text-muted-foreground">
          {tenant.roomNumber ? `${tenant.floorName} · Room ${tenant.roomNumber}` : 'Not yet allocated'}
        </p>
      </div>
      <div className="text-right">
        <p className="font-numeric text-sm font-semibold text-foreground">{formatCurrency(tenant.rent)}</p>
        <StatusChip token={rentToken} className="mt-1" />
      </div>
    </button>
  )
}
