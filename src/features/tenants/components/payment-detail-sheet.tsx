import { Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/common/status-chip'
import { rentStatusTokens } from '@/constants/status'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { PaymentMode, RentStatus } from '@/types/database.types'

export type HistoryEntry =
  | {
      kind: 'rent'
      id: string
      amount: number
      date: string
      createdAt: string
      mode: PaymentMode
      status: RentStatus
      notes: string | null
      receiptNumber: string | null
      receiptUrl: string | null
    }
  | {
      kind: 'deposit'
      amount: number
      date: string
      recordedAt: string
      screenshotUrl: string | null
    }

interface PaymentDetailSheetProps {
  entry: HistoryEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (paymentId: string) => void
}

export function PaymentDetailSheet({ entry, open, onOpenChange, onDelete }: PaymentDetailSheetProps) {
  if (!entry) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{entry.kind === 'deposit' ? 'Deposit' : 'Payment'} Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-numeric text-lg font-semibold text-foreground">{formatCurrency(entry.amount)}</p>
            </div>
            {entry.kind === 'rent' ? <StatusChip token={rentStatusTokens[entry.status]} /> : null}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Recorded</p>
              <p className="font-medium text-foreground">
                {formatDateTime(entry.kind === 'rent' ? entry.createdAt : entry.recordedAt)}
              </p>
            </div>
            {entry.kind === 'rent' ? (
              <div>
                <p className="text-xs text-muted-foreground">Mode</p>
                <p className="font-medium text-foreground capitalize">{entry.mode.replace('_', ' ')}</p>
              </div>
            ) : null}
            {entry.kind === 'rent' && entry.receiptNumber ? (
              <div>
                <p className="text-xs text-muted-foreground">Receipt</p>
                <p className="font-medium text-foreground">{entry.receiptNumber}</p>
              </div>
            ) : null}
          </div>

          {entry.kind === 'rent' && entry.notes ? (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm text-foreground">{entry.notes}</p>
            </div>
          ) : null}

          {entry.kind === 'deposit' && entry.screenshotUrl ? (
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Attached photo</p>
              <img
                src={entry.screenshotUrl}
                alt="Deposit proof"
                className="max-h-72 w-full rounded-lg border border-border/70 object-cover"
              />
            </div>
          ) : null}

          {entry.kind === 'rent' && entry.receiptUrl ? (
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Attached photo</p>
              <img
                src={entry.receiptUrl}
                alt="Payment receipt"
                className="max-h-72 w-full rounded-lg border border-border/70 object-cover"
              />
            </div>
          ) : null}

          {entry.kind === 'rent' ? (
            <Button
              variant="outline"
              className="w-full text-danger hover:text-danger"
              onClick={() => onDelete(entry.id)}
            >
              <Trash2 className="size-4" />
              Delete Payment
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
