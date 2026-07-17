import { useMemo, useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Fab } from '@/components/common/fab'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useTenants } from '@/features/tenants/hooks/use-tenants'
import { TenantListItem } from '@/features/tenants/components/tenant-list-item'
import { AddTenantSheet } from '@/features/tenants/components/add-tenant-sheet'
import { usePageTitle } from '@/hooks/use-page-title'

const filters = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'deposit_pending', label: 'Deposit Pending' },
] as const

type FilterValue = (typeof filters)[number]['value']

export function TenantsPage() {
  usePageTitle('Tenants')
  const { data: tenants, isLoading, isError, refetch } = useTenants()
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')

  const activeTenants = (tenants ?? []).filter((t) => t.status === 'active')

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase()
    return activeTenants.filter((t) => {
      if (query && !t.name.toLowerCase().includes(query) && !t.phone.includes(query)) return false
      if (filter === 'paid') return t.rentStatus === 'paid'
      if (filter === 'unpaid') return t.rentStatus !== 'paid'
      if (filter === 'deposit_pending') return !t.depositRecord
      return true
    })
  }, [activeTenants, search, filter])

  return (
    <>
      <PullToRefresh onRefresh={refetch}>
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                  filter === f.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/70 text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {isError ? (
            <ErrorState title="Couldn't load tenants" description="Please try again." onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px] rounded-xl" />
              ))}
            </div>
          ) : activeTenants.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No tenants yet"
              description="Add your first tenant or assign one from a vacant bed in the Building tab."
            />
          ) : filteredTenants.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description="Try a different search or filter." />
          ) : (
            <div className="space-y-2">
              {filteredTenants.map((tenant) => (
                <TenantListItem key={tenant.id} tenant={tenant} />
              ))}
            </div>
          )}

          <AddTenantSheet open={addOpen} onOpenChange={setAddOpen} />
        </div>
      </PullToRefresh>

      <Fab onClick={() => setAddOpen(true)}>
        <Plus className="size-6" />
      </Fab>
    </>
  )
}
