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
import { createHouse, updateHouse } from '../services/building.service'
import { houseTypeOptions } from '../types'
import type { HouseType } from '@/types/database.types'
import type { House } from '../types'

const houseTypeValues = houseTypeOptions.map((o) => o.value) as [HouseType, ...HouseType[]]

const houseSchema = z.object({
  houseNumber: z.string().min(1, 'Enter a house number'),
  houseType: z.enum(houseTypeValues),
  gasConnectionNumber: z.string().min(1, 'Enter a gas connection number'),
  electricityBillNumber: z.string().min(1, 'Enter an electricity bill number'),
})

type HouseFormValues = z.infer<typeof houseSchema>

interface AddHouseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floorId: string | null
  floorLabel?: string
  existingHouse?: House | null
}

export function AddHouseSheet({ open, onOpenChange, floorId, floorLabel, existingHouse }: AddHouseSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(existingHouse)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HouseFormValues>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      houseNumber: '',
      houseType: '1bhk',
      gasConnectionNumber: '',
      electricityBillNumber: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (existingHouse) {
      reset({
        houseNumber: existingHouse.houseNumber,
        houseType: existingHouse.houseType,
        gasConnectionNumber: existingHouse.gasConnectionNumber ?? '',
        electricityBillNumber: existingHouse.electricityBillNumber ?? '',
      })
    } else {
      reset({
        houseNumber: '',
        houseType: '1bhk',
        gasConnectionNumber: '',
        electricityBillNumber: '',
      })
    }
  }, [open, existingHouse, reset])

  const mutation = useMutation({
    mutationFn: (values: HouseFormValues) => {
      const gasConnectionNumber = values.gasConnectionNumber.trim()
      const electricityBillNumber = values.electricityBillNumber.trim()
      if (existingHouse) {
        return updateHouse({
          id: existingHouse.id,
          houseNumber: values.houseNumber,
          houseType: values.houseType,
          gasConnectionNumber,
          electricityBillNumber,
        })
      }
      if (!floorId) throw new Error('No floor selected')
      return createHouse({
        floorId,
        houseNumber: values.houseNumber,
        houseType: values.houseType,
        gasConnectionNumber,
        electricityBillNumber,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['building'] })
      toast.success(isEditing ? 'House updated' : 'House added')
      onOpenChange(false)
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : `Could not ${isEditing ? 'update' : 'add'} the house. Please try again.`,
      ),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit House' : `Add House${floorLabel ? ` · ${floorLabel}` : ''}`}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4 px-4 pb-8">
          <div className="space-y-1.5">
            <Label htmlFor="houseNumber">House number</Label>
            <Input id="houseNumber" placeholder="G1" {...register('houseNumber')} />
            {errors.houseNumber ? <p className="text-xs text-danger">{errors.houseNumber.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label>House type</Label>
            <Controller
              name="houseType"
              control={control}
              render={({ field }) => (
                // key={field.value} forces Radix's Select to remount instead
                // of receiving the new value as a prop change — when the
                // value is set programmatically (react-hook-form's reset()
                // when editing an existing house) rather than by the user
                // opening the dropdown, Radix doesn't recognize it and
                // silently fires onValueChange('') to "correct" itself,
                // wiping the value we just set. Remounting sidesteps that.
                <Select key={field.value} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {houseTypeOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gasConnectionNumber">Gas connection number</Label>
            <Input id="gasConnectionNumber" {...register('gasConnectionNumber')} />
            {errors.gasConnectionNumber ? <p className="text-xs text-danger">{errors.gasConnectionNumber.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="electricityBillNumber">Electricity bill number</Label>
            <Input id="electricityBillNumber" {...register('electricityBillNumber')} />
            {errors.electricityBillNumber ? (
              <p className="text-xs text-danger">{errors.electricityBillNumber.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending || (!floorId && !isEditing)}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEditing ? 'Save Changes' : 'Add House'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
