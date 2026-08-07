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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/common/date-picker'
import { createLoan, updateLoan } from '../services/loans.service'
import { lenderTypeOptions } from '../types'
import { todayIso } from '@/utils/format'
import type { LenderType } from '@/types/database.types'
import type { Loan } from '../types'

const lenderTypeValues = lenderTypeOptions.map((o) => o.value) as [LenderType, ...LenderType[]]

const loanSchema = z.object({
  lenderType: z.enum(lenderTypeValues),
  lenderName: z.string(),
  amount: z.number().positive('Enter a valid amount').max(100_000_000, 'Amount seems too high'),
  interestNote: z.string(),
  takenOn: z.string().min(1, 'Choose a date'),
  takenTill: z.string(),
  notes: z.string(),
})

type LoanFormValues = z.infer<typeof loanSchema>

const emptyValues = (): LoanFormValues => ({
  lenderType: 'bank',
  lenderName: '',
  amount: 0,
  interestNote: '',
  takenOn: todayIso(),
  takenTill: '',
  notes: '',
})

interface AddLoanSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingLoan?: Loan | null
}

export function AddLoanSheet({ open, onOpenChange, existingLoan }: AddLoanSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(existingLoan)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (!open) return
    if (existingLoan) {
      reset({
        lenderType: existingLoan.lenderType,
        lenderName: existingLoan.lenderName ?? '',
        amount: existingLoan.amount,
        interestNote: existingLoan.interestNote ?? '',
        takenOn: existingLoan.takenOn,
        takenTill: existingLoan.takenTill ?? '',
        notes: existingLoan.notes ?? '',
      })
    } else {
      reset(emptyValues())
    }
  }, [open, existingLoan, reset])

  const mutation = useMutation({
    mutationFn: (values: LoanFormValues) => {
      const shared = {
        lenderType: values.lenderType,
        lenderName: values.lenderName.trim() || null,
        amount: values.amount,
        interestNote: values.interestNote.trim() || null,
        takenOn: values.takenOn,
        takenTill: values.takenTill || null,
        notes: values.notes.trim() || null,
      }
      if (existingLoan) {
        return updateLoan({ id: existingLoan.id, ...shared })
      }
      return createLoan(shared)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['loans'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ])
      toast.success(isEditing ? 'Loan updated' : 'Loan added')
      onOpenChange(false)
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : `Could not ${isEditing ? 'update' : 'add'} the loan. Please try again.`),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Loan' : 'Add Loan'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4 px-4 pb-8">
          <div className="space-y-1.5">
            <Label>Loan Type</Label>
            <Controller
              name="lenderType"
              control={control}
              render={({ field }) => (
                <Select key={field.value} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lenderTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lenderName">Loan for (optional)</Label>
            <Input id="lenderName" placeholder="e.g. Marriage" {...register('lenderName')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Loan amount</Label>
            <Input id="amount" type="number" {...register('amount', { valueAsNumber: true })} />
            {errors.amount ? <p className="text-xs text-danger">{errors.amount.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="interestNote">Interest (optional)</Label>
            <Input id="interestNote" placeholder="e.g. 12% flat" {...register('interestNote')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Taken on</Label>
              <Controller
                name="takenOn"
                control={control}
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
              />
              {errors.takenOn ? <p className="text-xs text-danger">{errors.takenOn.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>End Date (optional)</Label>
              <Controller
                name="takenTill"
                control={control}
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} disableFuture={false} />}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" {...register('notes')} />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEditing ? 'Save Changes' : 'Add Loan'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
