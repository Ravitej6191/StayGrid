import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchCombobox } from '@/components/common/search-combobox'
import { useQueryClient } from '@tanstack/react-query'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { getCitiesForState, indianStates } from '@/constants/india-geo'
import { digitsOnly } from '@/utils/format'
import { useAuth } from '@/providers/auth-provider'
import { completeOnboarding } from '../services/onboarding.service'

const PHONE_REGEX = /^[6-9]\d{9}$/
const PINCODE_REGEX = /^\d{6}$/

const onboardingSchema = z.object({
  buildingName: z.string().min(2, 'Enter a name').max(80, 'Name is too long'),
  address: z.string().min(3, 'Enter an address').max(200, 'Address is too long'),
  city: z.string().min(1, 'Choose a city'),
  state: z.string().min(1, 'Choose a state'),
  pincode: z.string().regex(PINCODE_REGEX, 'Enter a valid 6-digit pincode'),
  ownerName: z.string().min(2, 'Enter your name').max(80, 'Name is too long'),
  phone: z.string().regex(PHONE_REGEX, 'Enter a valid 10-digit mobile number'),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

export function OnboardingForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitSuccessful },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onBlur',
    defaultValues: {
      buildingName: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      // Google's own consent flow already collected these, so pre-fill from
      // it — phone is rarely present (Google doesn't share it by default)
      // but we fill it when it is, per the user's "if not, leave it" ask.
      ownerName: user?.name ?? '',
      phone: user?.phone ?? '',
    },
  })

  useUnsavedChangesGuard(isDirty && !isSubmitSuccessful)

  const state = watch('state')
  const city = watch('city')
  const cityOptions = useMemo(() => (state ? getCitiesForState(state) : []), [state])

  useEffect(() => {
    if (state && city && !cityOptions.includes(city)) {
      setValue('city', '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const onSubmit = async (values: OnboardingFormValues) => {
    setIsSubmitting(true)
    try {
      await completeOnboarding({
        ...values,
        propertyType: 'pg',
      })
      await queryClient.invalidateQueries({ queryKey: ['onboarding', 'status'] })
      navigate('/dashboard', { replace: true })
    } catch {
      toast.error('Could not save your details. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex w-full max-w-lg flex-1 flex-col">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col justify-between gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="buildingName">Building name</Label>
          <Input id="buildingName" placeholder="Sunrise Heights" maxLength={80} {...register('buildingName')} />
          {errors.buildingName ? <p className="text-xs text-danger">{errors.buildingName.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" placeholder="12 MG Road" maxLength={200} {...register('address')} />
          {errors.address ? <p className="text-xs text-danger">{errors.address.message}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>State</Label>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              inputMode="numeric"
              placeholder="560001"
              maxLength={6}
              {...register('pincode', { onChange: (e) => { e.target.value = digitsOnly(e.target.value, 6) } })}
            />
            {errors.pincode ? <p className="text-xs text-danger">{errors.pincode.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              inputMode="numeric"
              placeholder="9876543210"
              maxLength={10}
              {...register('phone', { onChange: (e) => { e.target.value = digitsOnly(e.target.value, 10) } })}
            />
            {errors.phone ? <p className="text-xs text-danger">{errors.phone.message}</p> : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ownerName">Your name</Label>
          <Input id="ownerName" placeholder="Owner name" maxLength={80} {...register('ownerName')} />
          {errors.ownerName ? <p className="text-xs text-danger">{errors.ownerName.message}</p> : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Finish setup
        </Button>
      </form>
    </div>
  )
}

