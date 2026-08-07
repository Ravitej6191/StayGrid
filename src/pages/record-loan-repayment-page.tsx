import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HandCoins, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/common/date-picker'
import { EmptyState } from '@/components/common/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useLoans } from '@/features/loans/hooks/use-loans'
import { createLoanRepayment } from '@/features/loans/services/loans.service'
import { lenderTypeLabel } from '@/features/loans/types'
import { formatCurrency, todayIso } from '@/utils/format'
import { usePageTitle } from '@/hooks/use-page-title'

const repaymentSchema = z.object({
  loanId: z.string().min(1, 'Choose a loan'),
  amount: z.number().positive('Enter a valid amount').max(100_000_000, 'Amount seems too high'),
  paymentDate: z.string().min(1, 'Choose a date'),
  notes: z.string(),
})

type RepaymentFormValues = z.infer<typeof repaymentSchema>

export function RecordLoanRepaymentPage() {
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  usePageTitle('Record Loan', onBack)
  const [searchParams] = useSearchParams()
  const defaultLoanId = searchParams.get('loanId') ?? ''

  const queryClient = useQueryClient()
  const { data: loans, isLoading } = useLoans()
  const activeLoans = (loans ?? []).filter((l) => l.stillToPay > 0)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RepaymentFormValues>({
    resolver: zodResolver(repaymentSchema),
    defaultValues: { loanId: defaultLoanId, amount: 0, paymentDate: todayIso(), notes: '' },
  })

  const selectedLoanId = watch('loanId')
  const selectedLoan = activeLoans.find((l) => l.id === selectedLoanId)

  const mutation = useMutation({
    mutationFn: (values: RepaymentFormValues) =>
      createLoanRepayment({
        loanId: values.loanId,
        amount: values.amount,
        paymentDate: values.paymentDate,
        notes: values.notes.trim() || null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['loans'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ])
      toast.success('Repayment recorded')
      navigate(-1)
    },
    onError: () => toast.error('Could not record the repayment. Please try again.'),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    )
  }

  if (activeLoans.length === 0) {
    return (
      <EmptyState
        icon={HandCoins}
        title="No active loans"
        description="Add a loan first, then come back here to record repayments against it."
        action={<Button onClick={() => navigate('/loans')}>Go to Loans</Button>}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4 pb-8">
      <div className="space-y-1.5">
        <Label>Choose Loan</Label>
        <Controller
          name="loanId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a loan" />
              </SelectTrigger>
              <SelectContent>
                {activeLoans.map((loan) => (
                  <SelectItem key={loan.id} value={loan.id}>
                    {loan.lenderName || lenderTypeLabel(loan.lenderType)} · {formatCurrency(loan.stillToPay)} left
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.loanId ? <p className="text-xs text-danger">{errors.loanId.message}</p> : null}
      </div>

      {selectedLoan ? (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Loan Amount</p>
            <p className="font-numeric font-semibold text-foreground">{formatCurrency(selectedLoan.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Still to Pay</p>
            <p className="font-numeric font-semibold text-foreground">{formatCurrency(selectedLoan.stillToPay)}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" type="number" {...register('amount', { valueAsNumber: true })} />
        {errors.amount ? <p className="text-xs text-danger">{errors.amount.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label>Date</Label>
        <Controller
          name="paymentDate"
          control={control}
          render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
        />
        {errors.paymentDate ? <p className="text-xs text-danger">{errors.paymentDate.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" {...register('notes')} />
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Record Repayment
      </Button>
    </form>
  )
}
