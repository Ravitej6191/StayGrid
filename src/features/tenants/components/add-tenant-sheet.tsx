import { useEffect, useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { BedDouble, CheckCircle2, Loader2, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/common/empty-state'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { createTenant, reassignTenant, updateTenant } from '../services/tenants.service'
import type { Tenant } from '@/types/domain'

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

function digitsOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

const tenantSchema = z.object({
  name: z.string().min(2, 'Enter a name').max(80, 'Name is too long'),
  phone: z.string().regex(PHONE_REGEX, 'Enter a valid 10-digit mobile number'),
  email: z.string().max(254, 'Email is too long').refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email'),
  aadhaarNumber: z.string().refine((v) => !v || /^\d{12}$/.test(v), 'Enter a valid 12-digit Aadhaar number'),
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

interface AddTenantSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingTenant?: Tenant | null
}

type View = 'form' | 'created' | 'allocate' | 'allocated'

export function AddTenantSheet({ open, onOpenChange, existingTenant }: AddTenantSheetProps) {
  const queryClient = useQueryClient()
  const { data: building } = useBuildingData()
  const isEditing = Boolean(existingTenant)
  const [view, setView] = useState<View>('form')
  const [createdTenant, setCreatedTenant] = useState<{ id: string; name: string } | null>(null)
  const [allocatedBedLabel, setAllocatedBedLabel] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (!open) return
    setView('form')
    setCreatedTenant(null)
    setAllocatedBedLabel(null)
    setPhoto(existingTenant?.photoUrl ?? null)
    if (existingTenant) {
      reset({
        name: existingTenant.name,
        phone: existingTenant.phone,
        email: existingTenant.email ?? '',
        aadhaarNumber: existingTenant.aadhaarNumber ?? '',
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
  }, [open, existingTenant])

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
      onOpenChange(false)
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
    onError: () => toast.error('Could not allocate a bed. Please try again.'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const onSubmit = (values: TenantFormValues) => {
    const shared = {
      name: values.name,
      phone: values.phone,
      email: values.email || null,
      aadhaarNumber: values.aadhaarNumber || null,
      emergencyContactName: values.emergencyContactName || null,
      emergencyContactPhone: values.emergencyContactPhone || null,
      bloodGroup: values.bloodGroup || null,
      occupation: values.occupation || null,
      company: values.company || null,
      photoUrl: photo,
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
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const title = isEditing
    ? 'Edit Tenant'
    : view === 'created'
      ? 'Tenant Added'
      : view === 'allocate'
        ? 'Allocate Room'
        : view === 'allocated'
          ? 'Room Allocated'
          : 'Add Tenant'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {view === 'created' && createdTenant ? (
          <div className="flex flex-col items-center gap-4 px-4 pt-2 pb-8 text-center">
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
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Done
              </Button>
              <Button className="flex-1" onClick={() => setView('allocate')}>
                Allocate Room
              </Button>
            </div>
          </div>
        ) : view === 'allocate' && createdTenant ? (
          <div className="space-y-3 px-4 pb-8">
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
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Skip for Now
            </Button>
          </div>
        ) : view === 'allocated' && createdTenant ? (
          <div className="flex flex-col items-center gap-4 px-4 pt-2 pb-8 text-center">
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
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-8">
            <div className="flex justify-center">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border border-dashed border-border/70 bg-muted text-muted-foreground"
              >
                {photo ? (
                  <img src={photo} alt="Tenant" className="size-full object-cover" />
                ) : (
                  <UserRound className="size-8" />
                )}
              </button>
              {photo ? (
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  aria-label="Remove photo"
                  className="-ml-6 -mt-6 flex size-6 items-center justify-center self-start rounded-full bg-danger text-danger-foreground shadow-sm"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
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
              <Label htmlFor="aadhaarNumber">Aadhaar</Label>
              <Input
                id="aadhaarNumber"
                inputMode="numeric"
                maxLength={12}
                {...register('aadhaarNumber', { onChange: (e) => { e.target.value = digitsOnly(e.target.value, 12) } })}
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
        )}
      </SheetContent>
    </Sheet>
  )
}
