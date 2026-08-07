import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Search, UserRound, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { useTenants } from '@/features/tenants/hooks/use-tenants'
import { reassignTenant } from '@/features/tenants/services/tenants.service'
import type { House } from '../types'

interface AllotTenantSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  house: House | null
}

export function AllotTenantSheet({ open, onOpenChange, house }: AllotTenantSheetProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: tenants, isLoading } = useTenants()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const unallotted = (tenants ?? []).filter((t) => t.status === 'active' && t.houseId === null)
  const query = search.trim().toLowerCase()
  const filtered = query
    ? unallotted.filter((t) => t.name.toLowerCase().includes(query) || t.phone.includes(query))
    : unallotted

  const mutation = useMutation({
    mutationFn: (tenantId: string) => reassignTenant(tenantId, house!.id),
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
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not allot the tenant. Please try again.'),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Allot Tenant{house ? ` · House ${house.houseNumber}` : ''}</SheetTitle>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-8">
          <Button variant="outline" className="w-full" onClick={() => navigate('/tenants/new')}>
            <Plus className="size-4" />
            Add New Tenant
          </Button>

          {isLoading || unallotted.length === 0 ? null : (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {isLoading ? null : unallotted.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No unallotted tenants"
              description="Add a new tenant above, then come back to allot them a house."
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description="Try a different search." />
          ) : (
            filtered.map((tenant) => (
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
