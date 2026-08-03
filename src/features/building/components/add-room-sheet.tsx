import { useEffect, useRef } from 'react'
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
import { createRoom, updateRoom } from '../services/building.service'
import { roomTypeOptions } from '../types'
import type { RoomType } from '@/types/database.types'
import type { Room } from '../types'

const roomTypeValues = roomTypeOptions.map((o) => o.value) as [RoomType, ...RoomType[]]

const roomSchema = z.object({
  roomNumber: z.string().min(1, 'Enter a room number'),
  roomType: z.enum(roomTypeValues),
  bedCount: z.number().int().min(1, 'At least 1').max(30, 'Too many beds for one room'),
})

type RoomFormValues = z.infer<typeof roomSchema>

interface AddRoomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floorId: string | null
  floorLabel?: string
  existingRoom?: Room | null
}

export function AddRoomSheet({ open, onOpenChange, floorId, floorLabel, existingRoom }: AddRoomSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(existingRoom)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      roomNumber: '',
      roomType: 'single',
      bedCount: roomTypeOptions.find((o) => o.value === 'single')?.capacity ?? 1,
    },
  })

  useEffect(() => {
    if (!open) return
    if (existingRoom) {
      reset({
        roomNumber: existingRoom.roomNumber,
        roomType: existingRoom.roomType,
        bedCount: existingRoom.beds.length,
      })
    } else {
      reset({
        roomNumber: '',
        roomType: 'single',
        bedCount: roomTypeOptions.find((o) => o.value === 'single')?.capacity ?? 1,
      })
    }
  }, [open, existingRoom, reset])

  const roomType = watch('roomType')
  const previousRoomType = useRef(roomType)

  useEffect(() => {
    if (previousRoomType.current === roomType) return
    previousRoomType.current = roomType
    const typeOption = roomTypeOptions.find((o) => o.value === roomType)
    if (typeOption?.capacity != null) {
      setValue('bedCount', typeOption.capacity)
    }
  }, [roomType, setValue])

  const mutation = useMutation({
    mutationFn: (values: RoomFormValues) => {
      if (existingRoom) {
        return updateRoom({
          id: existingRoom.id,
          roomNumber: values.roomNumber,
          roomType: values.roomType,
          capacity: values.bedCount,
        })
      }
      if (!floorId) throw new Error('No floor selected')
      return createRoom({
        floorId,
        roomNumber: values.roomNumber,
        roomType: values.roomType,
        capacity: values.bedCount,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['building'] })
      toast.success(isEditing ? 'Room updated' : 'Room added')
      onOpenChange(false)
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : `Could not ${isEditing ? 'update' : 'add'} the room. Please try again.`),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Room' : `Add Room${floorLabel ? ` · ${floorLabel}` : ''}`}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4 px-4 pb-8">
          <div className="space-y-1.5">
            <Label htmlFor="roomNumber">Room number</Label>
            <Input id="roomNumber" placeholder="G1" {...register('roomNumber')} />
            {errors.roomNumber ? <p className="text-xs text-danger">{errors.roomNumber.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label>Room type</Label>
            <Controller
              name="roomType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypeOptions.map((t) => (
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
            <Label htmlFor="bedCount">Number of beds</Label>
            <Input id="bedCount" type="number" {...register('bedCount', { valueAsNumber: true })} />
            <p className="text-xs text-muted-foreground">Defaults to the room type, but you can adjust it for extra beds.</p>
            {errors.bedCount ? <p className="text-xs text-danger">{errors.bedCount.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending || (!floorId && !isEditing)}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEditing ? 'Save Changes' : 'Add Room'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
