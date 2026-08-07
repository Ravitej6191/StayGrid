import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/utils/format'
import { lenderTypeLabel } from '../types'
import type { Loan } from '../types'

export function LoanListItem({ loan }: { loan: Loan }) {
  const navigate = useNavigate()
  const percentPaid = loan.amount > 0 ? Math.min(100, Math.round((loan.paidTillNow / loan.amount) * 100)) : 0
  const isClosed = loan.stillToPay <= 0

  return (
    <button
      type="button"
      onClick={() => navigate(`/loans/${loan.id}`)}
      className="press-scale flex w-full flex-col gap-2.5 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {loan.lenderName || lenderTypeLabel(loan.lenderType)}
          </p>
          <p className="text-xs text-muted-foreground">
            {lenderTypeLabel(loan.lenderType)} · Taken {formatDate(loan.takenOn)}
          </p>
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

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Loan Amount</p>
          <p className="font-numeric font-semibold text-foreground">{formatCurrency(loan.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Still to Pay</p>
          <p className="font-numeric font-semibold text-foreground">{formatCurrency(loan.stillToPay)}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${percentPaid}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground">{percentPaid}% paid · {formatCurrency(loan.paidTillNow)}</p>
      </div>
    </button>
  )
}
