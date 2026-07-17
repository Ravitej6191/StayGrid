import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createFloor, updateFloor } from '../services/building.service'
import type { Floor } from '../types'

const floorSchema = z.object({
  name: z.string().min(1, 'Enter a name').max(60, 'Name is too long'),
})

type FloorFormValues = z.infer<typeof floorSchema>

interface AddFloorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nextFloorNumber: number
  existingFloor?: Floor | null
}

export function AddFloorSheet({ open, onOpenChange, nextFloorNumber, existingFloor }: AddFloorSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(existingFloor)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FloorFormValues>({
    resolver: zodResolver(floorSchema),
    defaultValues: { name: nextFloorNumber === 0 ? 'Ground Floor' : `Floor ${nextFloorNumber}` },
  })

  useEffect(() => {
    if (!open) return
    reset({ name: existingFloor ? existingFloor.name : nextFloorNumber === 0 ? 'Ground Floor' : `Floor ${nextFloorNumber}` })
  }, [open, nextFloorNumber, existingFloor, reset])

  const mutation = useMutation({
    mutationFn: (values: FloorFormValues) =>
      existingFloor ? updateFloor(existingFloor.id, values.name) : createFloor({ name: values.name, floorNumber: nextFloorNumber }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['building'] })
      toast.success(isEditing ? 'Floor updated' : 'Floor added')
      onOpenChange(false)
    },
    onError: () => toast.error(`Could not ${isEditing ? 'update' : 'add'} the floor. Please try again.`),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Floor' : 'Add Floor'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4 px-4 pb-8">
          <div className="space-y-1.5">
            <Label htmlFor="floorName">Floor name</Label>
            <Input id="floorName" maxLength={60} {...register('name')} />
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEditing ? 'Save Changes' : 'Add Floor'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
