import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HandCoins, Plus } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Fab } from '@/components/common/fab'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { Skeleton } from '@/components/ui/skeleton'
import { useLoans } from '@/features/loans/hooks/use-loans'
import { LoanListItem } from '@/features/loans/components/loan-list-item'
import { AddLoanSheet } from '@/features/loans/components/add-loan-sheet'
import { usePageTitle } from '@/hooks/use-page-title'

export function LoansPage() {
  const navigate = useNavigate()
  usePageTitle('Loans', () => navigate(-1))
  const { data: loans, isLoading, isError, refetch } = useLoans()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <PullToRefresh onRefresh={refetch}>
        <div className="space-y-2">
          {isError ? (
            <ErrorState title="Couldn't load loans" description="Please try again." onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : !loans || loans.length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title="No loans yet"
              description="Add a loan to start tracking what's borrowed and repaid."
              className="mt-4"
            />
          ) : (
            loans.map((loan) => <LoanListItem key={loan.id} loan={loan} />)
          )}
        </div>
      </PullToRefresh>

      <Fab onClick={() => setAddOpen(true)}>
        <Plus className="size-6" />
      </Fab>

      <AddLoanSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}
