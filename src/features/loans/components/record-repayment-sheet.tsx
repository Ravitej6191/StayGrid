import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/common/date-picker'
import { createLoanRepayment } from '../services/loans.service'
import { todayIso } from '@/utils/format'
import type { Loan } from '../types'

const repaymentSchema = z.object({
  amount: z.number().positive('Enter a valid amount').max(100_000_000, 'Amount seems too high'),
  paymentDate: z.string().min(1, 'Choose a date'),
  notes: z.string(),
})

type RepaymentFormValues = z.infer<typeof repaymentSchema>

interface RecordRepaymentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
}

export function RecordRepaymentSheet({ open, onOpenChange, loan }: RecordRepaymentSheetProps) {
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RepaymentFormValues>({
    resolver: zodResolver(repaymentSchema),
    defaultValues: { amount: 0, paymentDate: todayIso(), notes: '' },
  })

  useEffect(() => {
    if (open) reset({ amount: 0, paymentDate: todayIso(), notes: '' })
  }, [open, reset])

  const mutation = useMutation({
    mutationFn: (values: RepaymentFormValues) =>
      createLoanRepayment({
        loanId: loan!.id,
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
      onOpenChange(false)
    },
    onError: () => toast.error('Could not record the repayment. Please try again.'),
  })

  if (!loan) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Record Repayment</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4 px-4 pb-8">
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
      </SheetContent>
    </Sheet>
  )
}
