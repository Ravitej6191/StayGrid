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
import { expenseCategoryOptions, type Expense } from '../types'
import { createExpense, updateExpense } from '../services/expenses.service'

const expenseSchema = z
  .object({
    category: z.enum([
      'food', 'groceries', 'milk', 'vegetables', 'gas', 'electricity',
      'internet', 'cleaning', 'repairs', 'furniture', 'salary', 'misc',
    ]),
    amount: z
      .number({ error: 'Enter a valid amount' })
      .positive('Enter a valid amount')
      .max(10_000_000, 'Amount seems too high'),
    expenseDate: z.string().min(1, 'Choose a date'),
    description: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.category === 'misc' && !values.description.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Tell us what this expense was for',
      })
    }
  })

type ExpenseFormValues = z.infer<typeof expenseSchema>

interface AddExpenseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingExpense?: Expense | null
}

export function AddExpenseSheet({ open, onOpenChange, existingExpense }: AddExpenseSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(existingExpense)

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: 'groceries',
      amount: 0,
      expenseDate: new Date().toISOString().slice(0, 10),
      description: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (existingExpense) {
      reset({
        category: existingExpense.category,
        amount: existingExpense.amount,
        expenseDate: existingExpense.expenseDate,
        description: existingExpense.description ?? '',
      })
    } else {
      reset({ category: 'groceries', amount: 0, expenseDate: new Date().toISOString().slice(0, 10), description: '' })
    }
  }, [open, existingExpense, reset])

  const isOthers = watch('category') === 'misc'

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['expenses'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ])

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: async () => {
      await invalidateAll()
      toast.success('Expense added')
      onOpenChange(false)
    },
    onError: () => toast.error('Could not add expense. Please try again.'),
  })

  const updateMutation = useMutation({
    mutationFn: updateExpense,
    onSuccess: async () => {
      await invalidateAll()
      toast.success('Expense updated')
      onOpenChange(false)
    },
    onError: () => toast.error('Could not update expense. Please try again.'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const onSubmit = (values: ExpenseFormValues) => {
    const shared = {
      category: values.category,
      amount: values.amount,
      expenseDate: values.expenseDate,
      description: values.description || null,
    }
    if (existingExpense) {
      updateMutation.mutate({ id: existingExpense.id, ...shared })
    } else {
      createMutation.mutate(shared)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-8">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" {...register('amount', { valueAsNumber: true })} />
              {errors.amount ? <p className="text-xs text-danger">{errors.amount.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Controller
                name="expenseDate"
                control={control}
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{isOthers ? 'What was this for?' : 'Description (optional)'}</Label>
            <Input id="description" placeholder={isOthers ? 'e.g. Plumber visit' : undefined} {...register('description')} />
            {errors.description ? <p className="text-xs text-danger">{errors.description.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEditing ? 'Save Changes' : 'Add Expense'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
