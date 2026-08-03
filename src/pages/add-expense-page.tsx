import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/common/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/error-state'
import { expenseCategoryOptions } from '@/features/expenses/types'
import { useExpenses } from '@/features/expenses/hooks/use-expenses'
import { createExpense, updateExpense } from '@/features/expenses/services/expenses.service'
import { uploadTenantFile } from '@/lib/storage'
import { usePageTitle } from '@/hooks/use-page-title'

const expenseSchema = z
  .object({
    category: z.enum([
      'food', 'groceries', 'milk', 'vegetables', 'gas', 'electricity',
      'internet', 'cleaning', 'repairs', 'furniture', 'salary', 'misc',
    ]),
    amount: z
      .number({ error: 'Enter a valid amount' })
      .int('Enter a whole rupee amount')
      .min(1, 'Enter a valid amount')
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

export function AddExpensePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  const isEditing = Boolean(id)
  const { data: expenses, isLoading: isLoadingExpenses, isError } = useExpenses()
  const existingExpense = isEditing ? (expenses ?? []).find((e) => e.id === id) ?? null : null
  usePageTitle(isEditing ? 'Edit Expense' : 'Add Expense', onBack)

  const queryClient = useQueryClient()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setImageFile(file)
    setImagePreview(objectUrl)
  }

  const handleRemoveImage = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setImageFile(null)
    setImagePreview(null)
  }

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

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
    if (isEditing && !existingExpense) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setImageFile(null)
    if (existingExpense) {
      reset({
        category: existingExpense.category,
        amount: existingExpense.amount,
        expenseDate: existingExpense.expenseDate,
        description: existingExpense.description ?? '',
      })
      setImagePreview(existingExpense.imageUrl)
    } else {
      reset({ category: 'groceries', amount: 0, expenseDate: new Date().toISOString().slice(0, 10), description: '' })
      setImagePreview(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingExpense, isEditing, reset])

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
      navigate(-1)
    },
    onError: () => toast.error('Could not add expense. Please try again.'),
  })

  const updateMutation = useMutation({
    mutationFn: updateExpense,
    onSuccess: async () => {
      await invalidateAll()
      toast.success('Expense updated')
      navigate(-1)
    },
    onError: () => toast.error('Could not update expense. Please try again.'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending || isUploadingImage

  const onSubmit = async (values: ExpenseFormValues) => {
    let imageUrl = imageFile ? null : imagePreview
    if (imageFile) {
      setIsUploadingImage(true)
      try {
        imageUrl = await uploadTenantFile(imageFile, 'expense-receipts')
      } catch {
        toast.error('Could not upload the image. Please try again.')
        setIsUploadingImage(false)
        return
      }
      setIsUploadingImage(false)
    }

    const shared = {
      category: values.category,
      amount: values.amount,
      expenseDate: values.expenseDate,
      description: values.description || null,
      imageUrl,
    }
    if (existingExpense) {
      updateMutation.mutate({ id: existingExpense.id, ...shared })
    } else {
      createMutation.mutate(shared)
    }
  }

  if (isEditing && isLoadingExpenses) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (isEditing && (isError || !existingExpense)) {
    return <ErrorState title="Couldn't load this expense" description="Please go back and try again." />
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-8">
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

      <div className="space-y-1.5">
        <Label>Receipt photo (optional)</Label>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        {imagePreview ? (
          <div className="relative w-fit">
            <img src={imagePreview} alt="Expense receipt" className="h-32 rounded-lg border border-border object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              aria-label="Remove photo"
              className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-danger text-danger-foreground shadow-sm"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
            >
              <Camera className="size-4" />
              Take Photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
            >
              <ImagePlus className="size-4" />
              Upload Image
            </button>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isEditing ? 'Save Changes' : 'Add Expense'}
      </Button>
    </form>
  )
}
