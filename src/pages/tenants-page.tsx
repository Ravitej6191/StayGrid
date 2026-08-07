import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Fab } from '@/components/common/fab'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { Skeleton } from '@/components/ui/skeleton'
import { useTenants } from '@/features/tenants/hooks/use-tenants'
import { TenantListItem } from '@/features/tenants/components/tenant-list-item'
import { usePageTitle } from '@/hooks/use-page-title'

export function TenantsPage() {
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  usePageTitle('Tenants', onBack)
  const { data: tenants, isLoading, isError, refetch } = useTenants()
  const activeTenants = (tenants ?? []).filter((t) => t.status === 'active')

  return (
    <>
      <PullToRefresh onRefresh={refetch}>
        <div className="space-y-2">
          {isError ? (
            <ErrorState title="Couldn't load tenants" description="Please try again." onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px] rounded-xl" />
              ))}
            </div>
          ) : activeTenants.length === 0 ? (
            <EmptyState icon={Users} title="No tenants yet" description="Add a tenant from the Building tab to see them here." />
          ) : (
            activeTenants.map((tenant) => <TenantListItem key={tenant.id} tenant={tenant} />)
          )}
        </div>
      </PullToRefresh>

      <Fab onClick={() => navigate('/tenants/new')}>
        <Plus className="size-6" />
      </Fab>
    </>
  )
}
