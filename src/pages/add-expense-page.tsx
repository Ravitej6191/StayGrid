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
import { todayIso } from '@/utils/format'
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

/** A receipt photo either already saved (`url` only) or newly picked and
 * waiting to be uploaded on submit (`file` + a local object URL preview). */
interface PhotoItem {
  key: string
  url: string
  file?: File
}

export function AddExpensePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  const isEditing = Boolean(id)
  const { data: expenses, isLoading: isLoadingExpenses, isError } = useExpenses()
  const existingExpense = isEditing ? (expenses ?? []).find((e) => e.id === id) ?? null : null
  usePageTitle(isEditing ? 'Edit Expense' : 'Add Expense', onBack)

  const queryClient = useQueryClient()
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlsRef = useRef<Set<string>>(new Set())

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const newPhotos: PhotoItem[] = files.map((file) => {
      const objectUrl = URL.createObjectURL(file)
      objectUrlsRef.current.add(objectUrl)
      return { key: objectUrl, url: objectUrl, file }
    })
    setPhotos((current) => [...current, ...newPhotos])
  }

  const handleRemovePhoto = (key: string) => {
    setPhotos((current) => current.filter((p) => p.key !== key))
    if (objectUrlsRef.current.has(key)) {
      URL.revokeObjectURL(key)
      objectUrlsRef.current.delete(key)
    }
  }

  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url)
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
      expenseDate: todayIso(),
      description: '',
    },
  })

  useEffect(() => {
    if (isEditing && !existingExpense) return
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url)
    objectUrlsRef.current.clear()
    if (existingExpense) {
      reset({
        category: existingExpense.category,
        amount: existingExpense.amount,
        expenseDate: existingExpense.expenseDate,
        description: existingExpense.description ?? '',
      })
      setPhotos(existingExpense.imageUrls.map((url) => ({ key: url, url })))
    } else {
      reset({ category: 'groceries', amount: 0, expenseDate: todayIso(), description: '' })
      setPhotos([])
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

  const isPending = createMutation.isPending || updateMutation.isPending || isUploadingImages

  const onSubmit = async (values: ExpenseFormValues) => {
    let imageUrls: string[]
    if (photos.some((p) => p.file)) {
      setIsUploadingImages(true)
      try {
        imageUrls = await Promise.all(
          photos.map((p) => (p.file ? uploadTenantFile(p.file, 'expense-receipts') : Promise.resolve(p.url))),
        )
      } catch {
        toast.error('Could not upload the photos. Please try again.')
        setIsUploadingImages(false)
        return
      }
      setIsUploadingImages(false)
    } else {
      imageUrls = photos.map((p) => p.url)
    }

    const shared = {
      category: values.category,
      amount: values.amount,
      expenseDate: values.expenseDate,
      description: values.description || null,
      imageUrls,
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
            // key={field.value} forces Radix's Select to remount instead of
            // receiving the new value as a prop change — when the value is
            // set programmatically (react-hook-form's reset() when editing)
            // rather than by the user opening the dropdown, Radix doesn't
            // recognize it and silently fires onValueChange('') to "correct"
            // itself, wiping the value we just set. Remounting sidesteps
            // that self-correction entirely.
            <Select key={field.value} value={field.value} onValueChange={field.onChange}>
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
        <Label>Receipt photos (optional)</Label>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImagesChange} />
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />

        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div key={photo.key} className="relative">
                <img src={photo.url} alt="Expense receipt" className="aspect-square w-full rounded-lg border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.key)}
                  aria-label="Remove photo"
                  className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-danger text-danger-foreground shadow-sm"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

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
            Upload Images
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isEditing ? 'Save Changes' : 'Add Expense'}
      </Button>
    </form>
  )
}
