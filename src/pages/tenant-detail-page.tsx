import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Briefcase, ChevronRight, Droplet, IdCard, Pencil, Phone, Repeat, ShieldCheck, UserX } from 'lucide-react'
import { ErrorState } from '@/components/common/error-state'
import { StatusChip } from '@/components/common/status-chip'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { useTenant, usePaymentHistory } from '@/features/tenants/hooks/use-tenant'
import { RecordPaymentSheet } from '@/features/tenants/components/record-payment-sheet'
import { AddTenantSheet } from '@/features/tenants/components/add-tenant-sheet'
import { ReassignTenantSheet } from '@/features/tenants/components/reassign-tenant-sheet'
import { VacateTenantDialog } from '@/features/tenants/components/vacate-tenant-dialog'
import { PaymentDetailSheet, type HistoryEntry } from '@/features/tenants/components/payment-detail-sheet'
import { deletePayment } from '@/features/tenants/services/tenants.service'
import { rentStatusTokens } from '@/constants/status'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { usePageTitle } from '@/hooks/use-page-title'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

const formatDate = formatDateTime

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: tenant, isLoading, isError, refetch } = useTenant(id)
  const { data: payments } = usePaymentHistory(id)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [vacateOpen, setVacateOpen] = useState(false)
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)
  const onBack = useCallback(() => navigate(-1), [navigate])
  usePageTitle('Tenant Details', onBack)

  const deleteMutation = useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId, tenant!.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      toast.success('Payment deleted')
      setDeletePaymentId(null)
      setSelectedEntry(null)
    },
    onError: () => toast.error('Could not delete the payment. Please try again.'),
  })

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (isError || !tenant) {
    return (
      <div className="space-y-5">
        <ErrorState title="Couldn't load this tenant" description="Please try again." onRetry={() => refetch()} />
      </div>
    )
  }

  const isActive = tenant.status === 'active'
  const rentToken = rentStatusTokens[tenant.rentStatus]

  const history: HistoryEntry[] = [
    ...(payments ?? []).map(
      (p): HistoryEntry => ({
        kind: 'rent',
        id: p.id,
        amount: p.amount,
        date: p.paymentDate,
        mode: p.paymentMode,
        status: p.status,
        notes: p.notes,
        receiptNumber: p.receiptNumber,
      }),
    ),
    ...(tenant.depositRecord
      ? [
          {
            kind: 'deposit' as const,
            amount: tenant.depositRecord.amount,
            date: tenant.depositRecord.paidDate,
            screenshotUrl: tenant.depositRecord.screenshotUrl,
          },
        ]
      : []),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-4">
        {isActive ? (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setPaymentOpen(true)}>
              Record Payment
            </Button>
            <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} aria-label="Edit tenant">
              <Pencil className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setReassignOpen(true)} aria-label="Reassign room">
              <Repeat className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-danger hover:text-danger"
              onClick={() => setVacateOpen(true)}
              aria-label="Vacate tenant"
            >
              <UserX className="size-4" />
            </Button>
          </div>
        ) : null}

        <Card className="gap-3 border-border/70 bg-card/80 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Avatar className="size-14">
              {tenant.photoUrl ? <AvatarImage src={tenant.photoUrl} alt={tenant.name} /> : null}
              <AvatarFallback>{initials(tenant.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">{tenant.name}</p>
              <p className="text-sm text-muted-foreground">
                {tenant.roomNumber ? `${tenant.floorName} · Room ${tenant.roomNumber}` : 'Not Allotted'}
              </p>
            </div>
            {isActive ? (
              <Button variant="outline" size="icon" asChild aria-label="Call tenant">
                <a href={`tel:${tenant.phone}`}>
                  <Phone className="size-4" />
                </a>
              </Button>
            ) : (
              <StatusChip token={{ label: 'Vacated', dot: 'bg-neutral', badge: 'bg-neutral/15 text-neutral-foreground border-neutral/30' }} />
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Rent</p>
              <p className="font-numeric font-semibold text-foreground">{formatCurrency(tenant.rent)}</p>
              {isActive ? <StatusChip token={rentToken} className="mt-1" /> : null}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Deposit</p>
              <p className="font-numeric font-semibold text-foreground">{formatCurrency(tenant.deposit)}</p>
              <StatusChip
                token={
                  tenant.depositRecord
                    ? { label: 'Paid', dot: 'bg-success', badge: 'bg-success/15 text-success border-success/30' }
                    : { label: 'Pending', dot: 'bg-danger', badge: 'bg-danger/15 text-danger border-danger/30' }
                }
                className="mt-1"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0" /> {tenant.phone}
            </div>
            {tenant.aadhaarNumber ? (
              <div className="flex items-center gap-2">
                <IdCard className="size-3.5 shrink-0" /> {tenant.aadhaarNumber}
              </div>
            ) : null}
            {tenant.occupation ? (
              <div className="flex items-center gap-2">
                <Briefcase className="size-3.5 shrink-0" />
                {tenant.occupation}
                {tenant.company ? ` · ${tenant.company}` : ''}
              </div>
            ) : null}
            {tenant.emergencyContactName ? (
              <div className="flex items-center gap-2">
                <UserX className="size-3.5 shrink-0" />
                {tenant.emergencyContactName}
                {tenant.emergencyContactPhone ? ` · ${tenant.emergencyContactPhone}` : ''}
              </div>
            ) : null}
            {tenant.bloodGroup ? (
              <div className="flex items-center gap-2">
                <Droplet className="size-3.5 shrink-0" /> {tenant.bloodGroup}
              </div>
            ) : null}
            <p className="pt-0.5 text-xs">
              {isActive
                ? `Joined ${formatDate(tenant.joiningDate)}`
                : `${formatDate(tenant.joiningDate)} — ${tenant.vacatingDate ? formatDate(tenant.vacatingDate) : ''}`}
              {tenant.depositRecord ? ` · Deposit paid ${formatDate(tenant.depositRecord.paidDate)}` : ''}
            </p>
          </div>
        </Card>

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Payment History</p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <button
                  key={entry.kind === 'rent' ? entry.id : 'deposit'}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                  className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-left transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatCurrency(entry.amount)}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {entry.kind === 'deposit' ? 'Deposit' : entry.mode.replace('_', ' ')} · {formatDate(entry.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.kind === 'rent' ? (
                      <StatusChip token={rentStatusTokens[entry.status]} />
                    ) : (
                      <ShieldCheck className="size-4 text-success" />
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <PaymentDetailSheet
          entry={selectedEntry}
          open={selectedEntry !== null}
          onOpenChange={(open) => !open && setSelectedEntry(null)}
          onDelete={(paymentId) => {
            setSelectedEntry(null)
            setDeletePaymentId(paymentId)
          }}
        />

        <RecordPaymentSheet open={paymentOpen} onOpenChange={setPaymentOpen} defaultTenantId={tenant.id} />
        <AddTenantSheet open={editOpen} onOpenChange={setEditOpen} existingTenant={tenant} />
        <ReassignTenantSheet open={reassignOpen} onOpenChange={setReassignOpen} tenant={tenant} />
        <VacateTenantDialog open={vacateOpen} onOpenChange={setVacateOpen} tenant={tenant} onVacated={() => navigate(-1)} />

        <ConfirmSheet
          open={deletePaymentId !== null}
          onOpenChange={(open) => !open && setDeletePaymentId(null)}
          title="Delete this payment?"
          description="This removes it from the payment history and recalculates the tenant's rent status. This can't be undone."
          confirmLabel="Delete"
          isPending={deleteMutation.isPending}
          onConfirm={() => {
            if (deletePaymentId) deleteMutation.mutate(deletePaymentId)
          }}
        />
      </div>
    </PullToRefresh>
  )
}
