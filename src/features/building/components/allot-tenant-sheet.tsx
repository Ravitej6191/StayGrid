import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, UserRound, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/common/empty-state'
import { useTenants } from '@/features/tenants/hooks/use-tenants'
import { reassignTenant } from '@/features/tenants/services/tenants.service'
import type { Bed, Room } from '../types'

interface AllotTenantSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
  bed: Bed | null
}

export function AllotTenantSheet({ open, onOpenChange, room, bed }: AllotTenantSheetProps) {
  const queryClient = useQueryClient()
  const { data: tenants, isLoading } = useTenants()
  const unallotted = (tenants ?? []).filter((t) => t.status === 'active' && t.bedId === null)

  const mutation = useMutation({
    mutationFn: (tenantId: string) => reassignTenant(tenantId, bed!.id),
    onSuccess: async (_, tenantId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['building'] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      const tenant = unallotted.find((t) => t.id === tenantId)
      toast.success(tenant ? `${tenant.name} allotted` : 'Tenant allotted')
      onOpenChange(false)
    },
    onError: () => toast.error('Could not allot the tenant. Please try again.'),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>
            Allot Tenant{bed ? ` · Bed ${bed.bedLabel}` : ''}
            {room ? ` · Room ${room.roomNumber}` : ''}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2 px-4 pb-8">
          {isLoading ? null : unallotted.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No unallotted tenants"
              description="Add a tenant from the Tenants tab first, then come back to allot them a bed."
            />
          ) : (
            unallotted.map((tenant) => (
              <button
                key={tenant.id}
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(tenant.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60"
              >
                <UserRound className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-foreground">{tenant.name}</span>
                <span className="text-xs text-muted-foreground">{tenant.phone}</span>
                {mutation.isPending && mutation.variables === tenant.id ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
