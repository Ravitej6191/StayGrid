import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { BedDouble, Camera, CheckCircle2, Loader2, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/common/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { useTenant } from '@/features/tenants/hooks/use-tenant'
import { createTenant, reassignTenant, updateTenant } from '@/features/tenants/services/tenants.service'
import { uploadTenantFile } from '@/lib/storage'
import { digitsOnly, formatAadhaar } from '@/utils/format'
import { usePageTitle } from '@/hooks/use-page-title'

function Required() {
  return (
    <span className="text-danger" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

const PHONE_REGEX = /^[6-9]\d{9}$/
const MAX_AMOUNT = 10_000_000

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

const tenantSchema = z.object({
  name: z.string().min(2, 'Enter a name').max(80, 'Name is too long'),
  phone: z.string().regex(PHONE_REGEX, 'Enter a valid 10-digit mobile number'),
  email: z.string().max(254, 'Email is too long').refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email'),
  aadhaarNumber: z.string().regex(/^\d{4}-\d{4}-\d{4}$/, 'Enter a valid 12-digit Aadhaar number'),
  emergencyContactName: z.string().max(80, 'Name is too long'),
  emergencyContactPhone: z.string().refine((v) => !v || PHONE_REGEX.test(v), 'Enter a valid phone number'),
  bloodGroup: z.string(),
  occupation: z.string().max(60, 'Too long'),
  company: z.string().max(80, 'Too long'),
  rent: z.number().positive('Enter a valid amount').max(MAX_AMOUNT, 'Amount seems too high'),
  deposit: z.number().min(0).max(MAX_AMOUNT, 'Amount seems too high'),
})

type TenantFormValues = z.infer<typeof tenantSchema>

const emptyValues = (): TenantFormValues => ({
  name: '',
  phone: '',
  email: '',
  aadhaarNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  bloodGroup: '',
  occupation: '',
  company: '',
  rent: 0,
  deposit: 0,
})

type View = 'form' | 'created' | 'allocate' | 'allocated'

export function AddTenantPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  const isEditing = Boolean(id)
  const { data: existingTenant, isLoading: isLoadingTenant } = useTenant(id)
  usePageTitle(isEditing ? 'Edit Tenant' : 'Add Tenant', onBack)

  const queryClient = useQueryClient()
  const { data: building } = useBuildingData()
  const [view, setView] = useState<View>('form')
  const [createdTenant, setCreatedTenant] = useState<{ id: string; name: string } | null>(null)
  const [allocatedBedLabel, setAllocatedBedLabel] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    mode: 'onBlur',
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (isEditing && !existingTenant) return
    setPhotoFile(null)
    setPhotoPreview(existingTenant?.photoUrl ?? null)
    if (existingTenant) {
      reset({
        name: existingTenant.name,
        phone: existingTenant.phone,
        email: existingTenant.email ?? '',
        aadhaarNumber: existingTenant.aadhaarNumber ? formatAadhaar(existingTenant.aadhaarNumber) : '',
        emergencyContactName: existingTenant.emergencyContactName ?? '',
        emergencyContactPhone: existingTenant.emergencyContactPhone ?? '',
        bloodGroup: existingTenant.bloodGroup ?? '',
        occupation: existingTenant.occupation ?? '',
        company: existingTenant.company ?? '',
        rent: existingTenant.rent,
        deposit: existingTenant.deposit,
      })
    } else {
      reset(emptyValues())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingTenant, isEditing])

  const bedOptions = useMemo(() => {
    if (!building) return []
    const options: { bedId: string; label: string }[] = []
    for (const floor of building.floors) {
      for (const room of floor.rooms) {
        for (const bed of room.beds) {
          if (bed.status === 'vacant') {
            options.push({
              bedId: bed.id,
              label: `${floor.name} · Room ${room.roomNumber} · Bed ${bed.bedLabel}`,
            })
          }
        }
      }
    }
    return options
  }, [building])

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['building'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['tenants'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ])

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: async (newTenantId, variables) => {
      await invalidateAll()
      setCreatedTenant({ id: newTenantId, name: variables.name })
      setView('created')
    },
    onError: () => toast.error('Could not add tenant. Please try again.'),
  })

  const updateMutation = useMutation({
    mutationFn: updateTenant,
    onSuccess: async () => {
      await invalidateAll()
      toast.success('Tenant updated')
      navigate(-1)
    },
    onError: () => toast.error('Could not update tenant. Please try again.'),
  })

  const allocateMutation = useMutation({
    mutationFn: ({ tenantId, bedId }: { tenantId: string; bedId: string }) => reassignTenant(tenantId, bedId),
    onSuccess: async (_, variables) => {
      await invalidateAll()
      const bed = bedOptions.find((b) => b.bedId === variables.bedId)
      setAllocatedBedLabel(bed?.label ?? null)
      setView('allocated')
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not allocate a bed. Please try again.'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending || isUploadingPhoto

  const onSubmit = async (values: TenantFormValues) => {
    let photoUrl = photoFile ? null : photoPreview
    if (photoFile) {
      setIsUploadingPhoto(true)
      try {
        photoUrl = await uploadTenantFile(photoFile, 'tenant-photos')
      } catch {
        toast.error('Could not upload the photo. Please try again.')
        setIsUploadingPhoto(false)
        return
      }
      setIsUploadingPhoto(false)
    }

    const shared = {
      name: values.name,
      phone: values.phone,
      email: values.email || null,
      aadhaarNumber: values.aadhaarNumber.replace(/-/g, '') || null,
      emergencyContactName: values.emergencyContactName || null,
      emergencyContactPhone: values.emergencyContactPhone || null,
      bloodGroup: values.bloodGroup || null,
      occupation: values.occupation || null,
      company: values.company || null,
      photoUrl,
      rent: values.rent,
      deposit: values.deposit,
    }

    if (existingTenant) {
      updateMutation.mutate({ id: existingTenant.id, ...shared })
    } else {
      createMutation.mutate({ bedId: null, ...shared })
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setPhotoFile(file)
    setPhotoPreview(objectUrl)
  }

  const handleRemovePhoto = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  if (isEditing && isLoadingTenant) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (view === 'created' && createdTenant) {
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
          <p className="text-base font-semibold text-foreground">{createdTenant.name} added</p>
          <p className="text-sm text-muted-foreground">Allocate a room and bed now, or do it later from Building.</p>
        </div>
        <div className="flex w-full gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/tenants', { replace: true })}>
            Done
          </Button>
          <Button className="flex-1" onClick={() => setView('allocate')}>
            Allocate Room
          </Button>
        </div>
      </div>
    )
  }

  if (view === 'allocate' && createdTenant) {
    return (
      <div className="space-y-3">
        {bedOptions.length === 0 ? (
          <EmptyState icon={BedDouble} title="No vacant beds" description="Add a room or free up a bed first." />
        ) : (
          <div className="space-y-2">
            {bedOptions.map((option) => (
              <button
                key={option.bedId}
                type="button"
                disabled={allocateMutation.isPending}
                onClick={() => allocateMutation.mutate({ tenantId: createdTenant.id, bedId: option.bedId })}
                className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60"
              >
                <BedDouble className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-foreground">{option.label}</span>
                {allocateMutation.isPending ? <Loader2 className="size-4 shrink-0 animate-spin" /> : null}
              </button>
            ))}
          </div>
        )}
        <Button variant="outline" className="w-full" onClick={() => navigate('/tenants', { replace: true })}>
          Skip for Now
        </Button>
      </div>
    )
  }

  if (view === 'allocated' && createdTenant) {
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
          <p className="text-base font-semibold text-foreground">Tenant allocated</p>
          <p className="text-sm text-muted-foreground">
            {createdTenant.name} moved into {allocatedBedLabel ?? 'the selected bed'}.
          </p>
        </div>
        <Button className="w-full" onClick={() => navigate(`/tenants/${createdTenant.id}`, { replace: true })}>
          Done
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-8">
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={photoPreview ? 'Change photo' : 'Add photo'}
            className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border border-dashed border-border/70 bg-muted text-muted-foreground"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Tenant" className="size-full object-cover" />
            ) : (
              <UserRound className="size-8" />
            )}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={photoPreview ? 'Change photo' : 'Add photo'}
            className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-background"
          >
            <Camera className="size-3.5" />
          </button>
          {photoPreview ? (
            <button
              type="button"
              onClick={handleRemovePhoto}
              aria-label="Remove photo"
              className="absolute -top-1 -left-1 flex size-6 items-center justify-center rounded-full bg-danger text-danger-foreground shadow-sm ring-2 ring-background"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">Tap to {photoPreview ? 'change' : 'add'} photo</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">
          Full name
          <Required />
        </Label>
        <Input id="name" maxLength={80} {...register('name')} />
        {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="phone">
            Phone
            <Required />
          </Label>
          <Input
            id="phone"
            inputMode="numeric"
            maxLength={10}
            {...register('phone', { onChange: (e) => { e.target.value = digitsOnly(e.target.value, 10) } })}
          />
          {errors.phone ? <p className="text-xs text-danger">{errors.phone.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" maxLength={254} {...register('email')} />
          {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="aadhaarNumber">
          Aadhaar
          <Required />
        </Label>
        <Input
          id="aadhaarNumber"
          inputMode="numeric"
          placeholder="1234-5678-9012"
          maxLength={14}
          {...register('aadhaarNumber', { onChange: (e) => { e.target.value = formatAadhaar(e.target.value) } })}
        />
        {errors.aadhaarNumber ? <p className="text-xs text-danger">{errors.aadhaarNumber.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactName">Emergency Contact Person</Label>
          <Input id="emergencyContactName" maxLength={80} {...register('emergencyContactName')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactPhone">Emergency Phone Number</Label>
          <Input
            id="emergencyContactPhone"
            inputMode="numeric"
            maxLength={10}
            {...register('emergencyContactPhone', { onChange: (e) => { e.target.value = digitsOnly(e.target.value, 10) } })}
          />
          {errors.emergencyContactPhone ? (
            <p className="text-xs text-danger">{errors.emergencyContactPhone.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Blood Group</Label>
          <Controller
            name="bloodGroup"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {bloodGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="occupation">Occupation</Label>
          <Input id="occupation" maxLength={60} {...register('occupation')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company">Company / College</Label>
        <Input id="company" maxLength={80} {...register('company')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rent">
            Rent
            <Required />
          </Label>
          <Input id="rent" type="number" {...register('rent', { valueAsNumber: true })} />
          {errors.rent ? <p className="text-xs text-danger">{errors.rent.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deposit">
            Deposit
            <Required />
          </Label>
          <Input id="deposit" type="number" {...register('deposit', { valueAsNumber: true })} />
          {errors.deposit ? <p className="text-xs text-danger">{errors.deposit.message}</p> : null}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isEditing ? 'Save Changes' : 'Add Tenant'}
      </Button>
    </form>
  )
}
