import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchCombobox } from '@/components/common/search-combobox'
import { getCitiesForState, indianStates } from '@/constants/india-geo'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { updateProfile } from '@/features/onboarding/services/onboarding.service'
import { useAuth } from '@/providers/auth-provider'
import { usePageTitle } from '@/hooks/use-page-title'
import { digitsOnly } from '@/utils/format'
import type { PropertyType } from '@/types/database.types'

const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/
const PHONE_REGEX = /^[6-9]\d{9}$/
const PINCODE_REGEX = /^\d{6}$/

const profileSchema = z.object({
  buildingName: z.string().min(2, 'Enter a name').max(80, 'Name is too long'),
  address: z.string().min(3, 'Enter an address').max(200, 'Address is too long'),
  city: z.string().min(1, 'Choose a city'),
  state: z.string().min(1, 'Choose a state'),
  pincode: z.string().regex(PINCODE_REGEX, 'Enter a valid 6-digit pincode'),
  ownerName: z.string().min(2, 'Enter your name').max(80, 'Name is too long'),
  phone: z.string().regex(PHONE_REGEX, 'Enter a valid 10-digit mobile number'),
  gstNumber: z.string().refine((v) => !v || GST_REGEX.test(v), 'Enter a valid GSTIN'),
  panNumber: z.string().refine((v) => !v || PAN_REGEX.test(v), 'Enter a valid PAN'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function EditProfilePage() {
  const navigate = useNavigate()
  usePageTitle('Edit Profile', () => navigate(-1))
  const { data } = useBuildingData()
  const { user } = useAuth()

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <EditProfileForm
      propertyType={data.building.propertyType}
      buildingName={data.building.name}
      address={data.building.address}
      city={data.building.city}
      state={data.building.state}
      pincode={data.building.pincode}
      ownerName={data.building.ownerName || user?.name || ''}
      phone={data.building.contactPhone}
      gstNumber={data.building.gstNumber ?? ''}
      panNumber={data.building.panNumber ?? ''}
    />
  )
}

interface EditProfileFormProps {
  propertyType: PropertyType
  buildingName: string
  address: string
  city: string
  state: string
  pincode: string
  ownerName: string
  phone: string
  gstNumber: string
  panNumber: string
}

function EditProfileForm({ propertyType, ...defaultValues }: EditProfileFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues,
  })

  const state = watch('state')
  const cityOptions = useMemo(() => (state ? getCitiesForState(state) : []), [state])

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true)
    try {
      await updateProfile({
        ...values,
        propertyType,
        gstNumber: values.gstNumber || null,
        panNumber: values.panNumber || null,
      })
      await queryClient.invalidateQueries({ queryKey: ['building'] })
      toast.success('Profile updated')
      navigate(-1)
    } catch {
      toast.error('Could not save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-8">
      <div className="space-y-1.5">
        <Label htmlFor="buildingName">Building / PG / Residency name</Label>
        <Input id="buildingName" maxLength={80} {...register('buildingName')} />
        {errors.buildingName ? <p className="text-xs text-danger">{errors.buildingName.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" maxLength={200} {...register('address')} />
        {errors.address ? <p className="text-xs text-danger">{errors.address.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>State</Label>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              // key={field.value} forces Radix's Select to remount instead
              // of receiving the new value as a prop change — when the
              // value is set programmatically (react-hook-form's reset()
              // from the existing building profile) rather than by the
              // user opening the dropdown, Radix doesn't recognize it and
              // silently fires onValueChange('') to "correct" itself,
              // wiping the value we just set. Remounting sidesteps that.
              <Select key={field.value} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {indianStates.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.state ? <p className="text-xs text-danger">{errors.state.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <SearchCombobox
                options={cityOptions}
                value={field.value}
                onChange={field.onChange}
                disabled={!state}
                placeholder={state ? 'Select city' : 'Choose a state first'}
                emptyText="No matching city."
              />
            )}
          />
          {errors.city ? <p className="text-xs text-danger">{errors.city.message}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pincode">Pincode</Label>
        <Input
          id="pincode"
          inputMode="numeric"
          maxLength={6}
          {...register('pincode', { onChange: (e) => { e.target.value = digitsOnly(e.target.value, 6) } })}
        />
        {errors.pincode ? <p className="text-xs text-danger">{errors.pincode.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ownerName">Your name</Label>
        <Input id="ownerName" maxLength={80} {...register('ownerName')} />
        {errors.ownerName ? <p className="text-xs text-danger">{errors.ownerName.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          inputMode="numeric"
          maxLength={10}
          {...register('phone', { onChange: (e) => { e.target.value = digitsOnly(e.target.value, 10) } })}
        />
        {errors.phone ? <p className="text-xs text-danger">{errors.phone.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gstNumber">GST (optional)</Label>
          <Input
            id="gstNumber"
            className="uppercase"
            maxLength={15}
            {...register('gstNumber', { onChange: (e) => { e.target.value = e.target.value.toUpperCase().slice(0, 15) } })}
          />
          {errors.gstNumber ? <p className="text-xs text-danger">{errors.gstNumber.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="panNumber">PAN (optional)</Label>
          <Input
            id="panNumber"
            className="uppercase"
            maxLength={10}
            {...register('panNumber', { onChange: (e) => { e.target.value = e.target.value.toUpperCase().slice(0, 10) } })}
          />
          {errors.panNumber ? <p className="text-xs text-danger">{errors.panNumber.message}</p> : null}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSaving}>
        {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
        Save changes
      </Button>
    </form>
  )
}
