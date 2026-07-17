import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { Skeleton } from '@/components/ui/skeleton'
import { useTenants } from '@/features/tenants/hooks/use-tenants'
import { PastTenantListItem } from '@/features/tenants/components/past-tenant-list-item'
import { usePageTitle } from '@/hooks/use-page-title'

export function PastTenantsPage() {
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  usePageTitle('Past Tenants', onBack)
  const { data: tenants, isLoading, isError, refetch } = useTenants()
  const pastTenants = (tenants ?? []).filter((t) => t.status === 'vacated')

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-5">
        {isError ? (
          <ErrorState title="Couldn't load past tenants" description="Please try again." onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] rounded-xl" />
            ))}
          </div>
        ) : pastTenants.length === 0 ? (
          <EmptyState icon={Users} title="No past tenants" description="Tenants you vacate will show up here with their stay history." />
        ) : (
          <div className="space-y-2">
            {pastTenants.map((tenant) => (
              <PastTenantListItem key={tenant.id} tenant={tenant} />
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}
