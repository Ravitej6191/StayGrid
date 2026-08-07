import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { IndianRupee, Pencil, Plus, Trash2 } from 'lucide-react'
import { ErrorState } from '@/components/common/error-state'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLoans, useLoanRepayments } from '@/features/loans/hooks/use-loans'
import { AddLoanSheet } from '@/features/loans/components/add-loan-sheet'
import { RecordRepaymentSheet } from '@/features/loans/components/record-repayment-sheet'
import { deleteLoan, deleteLoanRepayment } from '@/features/loans/services/loans.service'
import { lenderTypeLabel } from '@/features/loans/types'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'
import { usePageTitle } from '@/hooks/use-page-title'
import { cn } from '@/lib/utils'

export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const onBack = useCallback(() => navigate(-1), [navigate])
  const { data: loans, isLoading, isError, refetch } = useLoans()
  const loan = (loans ?? []).find((l) => l.id === id) ?? null
  const { data: repayments } = useLoanRepayments(id)
  usePageTitle('Loan Details', onBack)

  const [editOpen, setEditOpen] = useState(false)
  const [repaymentOpen, setRepaymentOpen] = useState(false)
  const [deleteLoanOpen, setDeleteLoanOpen] = useState(false)
  const [deleteRepaymentId, setDeleteRepaymentId] = useState<string | null>(null)

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['loans'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])

  const deleteLoanMutation = useMutation({
    mutationFn: () => deleteLoan(loan!.id),
    onSuccess: async () => {
      await invalidateAll()
      toast.success('Loan deleted')
      navigate(-1)
    },
    onError: () => toast.error('Could not delete the loan. Please try again.'),
  })

  const deleteRepaymentMutation = useMutation({
    mutationFn: (repaymentId: string) => deleteLoanRepayment(repaymentId),
    onSuccess: async () => {
      await invalidateAll()
      toast.success('Repayment deleted')
      setDeleteRepaymentId(null)
    },
    onError: () => toast.error('Could not delete the repayment. Please try again.'),
  })

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (isError || !loan) {
    return <ErrorState title="Couldn't load this loan" description="Please try again." onRetry={() => refetch()} />
  }

  const percentPaid = loan.amount > 0 ? Math.min(100, Math.round((loan.paidTillNow / loan.amount) * 100)) : 0
  const isClosed = loan.stillToPay <= 0

  const facts = [
    { label: 'Loan Type', value: lenderTypeLabel(loan.lenderType) },
    ...(loan.lenderName ? [{ label: 'Loan for', value: loan.lenderName }] : []),
    ...(loan.interestNote ? [{ label: 'Interest', value: loan.interestNote }] : []),
    { label: 'Taken on', value: formatDate(loan.takenOn) },
    ...(loan.takenTill ? [{ label: 'End Date', value: formatDate(loan.takenTill) }] : []),
  ]

  return (
    <>
      <PullToRefresh onRefresh={refetch}>
        <div className="space-y-5 pb-8">
          <Card className="gap-3 border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-foreground">
                  {loan.lenderName || lenderTypeLabel(loan.lenderType)}
                </p>
                <p className="text-xs text-muted-foreground">{lenderTypeLabel(loan.lenderType)}</p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  isClosed ? 'border-success/30 bg-success/15 text-success' : 'border-warning/30 bg-warning/15 text-warning',
                )}
              >
                {isClosed ? 'Closed' : 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-3 divide-x divide-border rounded-lg bg-muted/50 text-sm">
              <div className="flex flex-col gap-1 p-3">
                <p className="text-xs text-muted-foreground">Loan Amount</p>
                <p className="font-numeric text-base font-semibold text-foreground">{formatCurrency(loan.amount)}</p>
              </div>
              <div className="flex flex-col gap-1 p-3">
                <p className="text-xs text-muted-foreground">Paid Till Now</p>
                <p className="font-numeric text-base font-semibold text-success">{formatCurrency(loan.paidTillNow)}</p>
              </div>
              <div className="flex flex-col gap-1 p-3">
                <p className="text-xs text-muted-foreground">Still to Pay</p>
                <p className="font-numeric text-base font-semibold text-danger">{formatCurrency(loan.stillToPay)}</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-success transition-all" style={{ width: `${percentPaid}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">{percentPaid}% paid</p>
            </div>

            <div className="space-y-2 text-sm">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{fact.label}</span>
                  <span className="font-medium text-foreground">{fact.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-danger hover:text-danger"
                onClick={() => setDeleteLoanOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </Card>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Repayment History</p>
              <Button size="sm" variant="outline" onClick={() => setRepaymentOpen(true)}>
                <Plus className="size-3.5" />
                Record
              </Button>
            </div>
            {!repayments || repayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repayments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {repayments.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                        <IndianRupee className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{formatCurrency(r.amount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Delete repayment"
                      className="text-danger hover:text-danger"
                      onClick={() => setDeleteRepaymentId(r.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      <AddLoanSheet open={editOpen} onOpenChange={setEditOpen} existingLoan={loan} />
      <RecordRepaymentSheet open={repaymentOpen} onOpenChange={setRepaymentOpen} loan={loan} />

      <ConfirmSheet
        open={deleteLoanOpen}
        onOpenChange={setDeleteLoanOpen}
        title="Delete this loan?"
        description="This removes the loan and all its repayment history. This can't be undone."
        confirmLabel="Delete"
        isPending={deleteLoanMutation.isPending}
        onConfirm={() => deleteLoanMutation.mutate()}
      />

      <ConfirmSheet
        open={deleteRepaymentId !== null}
        onOpenChange={(open) => !open && setDeleteRepaymentId(null)}
        title="Delete this repayment?"
        description="This can't be undone."
        confirmLabel="Delete"
        isPending={deleteRepaymentMutation.isPending}
        onConfirm={() => {
          if (deleteRepaymentId) deleteRepaymentMutation.mutate(deleteRepaymentId)
        }}
      />
    </>
  )
}
