import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Camera, CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/common/date-picker'
import { TenantCombobox } from '@/features/tenants/components/tenant-combobox'
import { useTenants } from '@/features/tenants/hooks/use-tenants'
import { createPayment, recordDeposit } from '@/features/tenants/services/tenants.service'
import { uploadTenantFile } from '@/lib/storage'
import { formatCurrency, monthKey, monthKeyOfDateString, todayIso } from '@/utils/format'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/use-page-title'

const paymentModes = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
] as const

const recordSchema = z.object({
  tenantId: z.string().min(1, 'Choose a tenant'),
  recordType: z.enum(['rent', 'deposit']),
  amount: z.number().positive('Enter a valid amount').max(10_000_000, 'Amount seems too high'),
  extraAmount: z.number().min(0).max(10_000_000, 'Amount seems too high'),
  paymentMode: z.enum(['cash', 'upi', 'bank_transfer', 'cheque']),
  paymentDate: z.string().min(1, 'Choose a date'),
  notes: z.string(),
})

type RecordFormValues = z.infer<typeof recordSchema>

const emptyValues = (defaultTenantId?: string): RecordFormValues => ({
  tenantId: defaultTenantId ?? '',
  recordType: 'rent',
  amount: 0,
  extraAmount: 0,
  paymentMode: 'cash',
  paymentDate: todayIso(),
  notes: '',
})

export function RecordPaymentPage() {
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  usePageTitle('Record Payment', onBack)
  const [searchParams] = useSearchParams()
  const defaultTenantId = searchParams.get('tenantId') ?? undefined

  const queryClient = useQueryClient()
  const { data: tenants } = useTenants()
  const activeTenants = (tenants ?? []).filter((t) => t.status === 'active')
  const preselectedTenant = defaultTenantId ? activeTenants.find((t) => t.id === defaultTenantId) : undefined
  const [view, setView] = useState<'form' | 'success'>('form')
  const [successInfo, setSuccessInfo] = useState<{ tenantName: string; amount: number; kind: 'rent' | 'deposit' } | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: emptyValues(defaultTenantId),
  })

  const selectedTenantId = watch('tenantId')
  const recordType = watch('recordType')
  const paymentDate = watch('paymentDate')
  const selectedTenant = activeTenants.find((t) => t.id === selectedTenantId)
  const isCurrentMonth = paymentDate ? monthKeyOfDateString(paymentDate) === monthKey(new Date()) : true
  const alreadyPaid = recordType === 'rent' && isCurrentMonth && selectedTenant?.rentStatus === 'paid'
  const isDepositEdit = recordType === 'deposit' && Boolean(selectedTenant?.depositRecord)

  const tenantOptions = activeTenants

  useEffect(() => {
    if (!selectedTenant) return
    if (recordType === 'rent') {
      setValue('amount', selectedTenant.rent)
      setScreenshotFile(null)
      setScreenshotPreview(null)
    } else {
      setValue('amount', selectedTenant.depositRecord?.amount ?? selectedTenant.deposit)
      setValue('paymentDate', selectedTenant.depositRecord?.paidDate || todayIso())
      setScreenshotFile(null)
      setScreenshotPreview(selectedTenant.depositRecord?.screenshotUrl ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, recordType, tenants])

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['building'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['tenants'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ])

  const rentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: async (_, variables) => {
      await invalidateAll()
      setSuccessInfo({ tenantName: selectedTenant?.name ?? 'Tenant', amount: variables.amount, kind: 'rent' })
      setView('success')
    },
    onError: () => toast.error('Could not record payment. Please try again.'),
  })

  const depositMutation = useMutation({
    mutationFn: recordDeposit,
    onSuccess: async (_, variables) => {
      await invalidateAll()
      setSuccessInfo({ tenantName: selectedTenant?.name ?? 'Tenant', amount: variables.amount, kind: 'deposit' })
      setView('success')
    },
    onError: () => toast.error('Could not record the deposit. Please try again.'),
  })

  const isPending = rentMutation.isPending || depositMutation.isPending || isUploadingScreenshot

  const onSubmit = async (values: RecordFormValues) => {
    let photoUrl = screenshotFile ? null : screenshotPreview
    if (screenshotFile) {
      setIsUploadingScreenshot(true)
      try {
        photoUrl = await uploadTenantFile(
          screenshotFile,
          values.recordType === 'deposit' ? 'deposit-screenshots' : 'rent-receipts',
        )
      } catch {
        toast.error('Could not upload the photo. Please try again.')
        setIsUploadingScreenshot(false)
        return
      }
      setIsUploadingScreenshot(false)
    }

    if (values.recordType === 'deposit') {
      depositMutation.mutate({
        tenantId: values.tenantId,
        amount: values.amount,
        paidDate: values.paymentDate,
        screenshotUrl: photoUrl,
      })
    } else {
      if (alreadyPaid) return
      const forMonth = monthKeyOfDateString(values.paymentDate) + '-01'
      rentMutation.mutate({
        tenantId: values.tenantId,
        amount: values.amount + (values.extraAmount || 0),
        paymentMode: values.paymentMode,
        paymentDate: values.paymentDate,
        forMonth,
        notes: values.notes || null,
        receiptUrl: photoUrl,
      })
    }
  }

  const handleRecordAnother = () => {
    setValue('tenantId', defaultTenantId ?? '')
    setValue('recordType', 'rent')
    setValue('amount', 0)
    setValue('extraAmount', 0)
    setValue('paymentMode', 'cash')
    setValue('paymentDate', todayIso())
    setValue('notes', '')
    setSuccessInfo(null)
    setScreenshotFile(null)
    setScreenshotPreview(null)
    setView('form')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setScreenshotFile(file)
    setScreenshotPreview(objectUrl)
  }

  const handleRemoveScreenshot = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setScreenshotFile(null)
    setScreenshotPreview(null)
  }

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  if (view === 'success' && successInfo) {
    return (
      <div className="flex flex-col items-center gap-4 pt-6 pb-8 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success"
        >
          <CheckCircle2 className="size-9" />
        </motion.div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            {successInfo.kind === 'deposit' ? 'Deposit recorded' : 'Payment recorded'}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(successInfo.amount)} {successInfo.kind === 'deposit' ? 'saved' : 'recorded'} for {successInfo.tenantName}.
          </p>
        </div>
        <div className="flex w-full gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            Close
          </Button>
          <Button className="flex-1" onClick={handleRecordAnother}>
            Record Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-8">
      <div className="space-y-1.5">
        <Label>Tenant</Label>
        {preselectedTenant ? (
          <div className="rounded-lg border border-border/70 bg-muted px-3 py-2 text-sm text-foreground">
            {preselectedTenant.name}
          </div>
        ) : (
          <Controller
            name="tenantId"
            control={control}
            render={({ field }) => (
              <TenantCombobox tenants={tenantOptions} value={field.value} onChange={field.onChange} />
            )}
          />
        )}
        {errors.tenantId ? <p className="text-xs text-danger">{errors.tenantId.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label>Record type</Label>
        <Controller
          name="recordType"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 p-1">
              {(['rent', 'deposit'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => field.onChange(type)}
                  className={cn(
                    'rounded-md py-1.5 text-sm font-medium capitalize transition-colors',
                    field.value === type ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {alreadyPaid ? (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{selectedTenant?.name} has already paid rent for this month.</span>
        </div>
      ) : null}

      {isDepositEdit ? (
        <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/10 px-3 py-2.5 text-sm text-info">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            Deposit already collected for {selectedTenant?.name}
            {selectedTenant?.depositRecord ? ` on ${new Date(selectedTenant.depositRecord.paidDate).toLocaleDateString('en-IN')}` : ''}.
            Saving here updates that record.
          </span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" type="number" disabled={alreadyPaid} {...register('amount', { valueAsNumber: true })} />
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

      {recordType === 'rent' ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="extraAmount">Extra / Others (optional)</Label>
            <Input id="extraAmount" type="number" disabled={alreadyPaid} {...register('extraAmount', { valueAsNumber: true })} />
            {errors.extraAmount ? <p className="text-xs text-danger">{errors.extraAmount.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label>Payment mode</Label>
            <Controller
              name="paymentMode"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={alreadyPaid}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" disabled={alreadyPaid} {...register('notes')} />
          </div>
        </>
      ) : null}

      {!alreadyPaid ? (
        <div className="space-y-1.5">
          <Label>{recordType === 'deposit' ? 'Photo (optional)' : 'Receipt photo (optional)'}</Label>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          {screenshotPreview ? (
            <div className="relative w-fit">
              <img
                src={screenshotPreview}
                alt={recordType === 'deposit' ? 'Deposit proof' : 'Payment receipt'}
                className="h-32 rounded-lg border border-border/70 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveScreenshot}
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
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 py-4 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
              >
                <Camera className="size-4" />
                Take Photo
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 py-4 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
              >
                <ImagePlus className="size-4" />
                Upload Image
              </button>
            </div>
          )}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending || alreadyPaid || !selectedTenantId}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {recordType === 'deposit' ? (isDepositEdit ? 'Update Deposit' : 'Save Deposit') : 'Record Payment'}
      </Button>
    </form>
  )
}
