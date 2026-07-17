import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { sendBroadcast } from '../services/broadcast.service'
import type { Tenant } from '@/types/domain'

const broadcastSchema = z.object({
  message: z.string().min(2, 'Enter a message'),
  audience: z.string().min(1),
})

type BroadcastFormValues = z.infer<typeof broadcastSchema>

interface BroadcastSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BroadcastSheet({ open, onOpenChange }: BroadcastSheetProps) {
  const { data: building } = useBuildingData()
  const queryClient = useQueryClient()

  const allTenants = useMemo(() => {
    const list: (Tenant & { floorId: string })[] = []
    for (const floor of building?.floors ?? []) {
      for (const room of floor.rooms) {
        for (const bed of room.beds) {
          if (bed.tenant) list.push({ ...bed.tenant, floorId: floor.id })
        }
      }
    }
    return list
  }, [building])

  const audienceGroups = useMemo(() => {
    const general = [
      { value: 'all', label: 'All Tenants' },
      { value: 'pending_rent', label: 'Pending Rent' },
      { value: 'pending_deposit', label: 'Pending Deposit' },
    ]
    const floors = (building?.floors ?? []).map((f) => ({ value: `floor:${f.id}`, label: f.name }))
    const rooms = (building?.floors ?? []).flatMap((f) =>
      f.rooms.map((r) => ({ value: `room:${r.id}`, label: `${f.name} · Room ${r.roomNumber}` })),
    )
    return { general, floors, rooms }
  }, [building])

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { message: '', audience: 'all' },
  })

  const resolveRecipients = (audience: string): { phones: string[]; label: string } => {
    if (audience === 'all') {
      return { phones: allTenants.map((t) => t.phone), label: 'All Tenants' }
    }
    if (audience === 'pending_rent') {
      return {
        phones: allTenants.filter((t) => t.rentStatus !== 'paid').map((t) => t.phone),
        label: 'Pending Rent',
      }
    }
    if (audience === 'pending_deposit') {
      return {
        phones: allTenants.filter((t) => !t.depositRecord).map((t) => t.phone),
        label: 'Pending Deposit',
      }
    }
    if (audience.startsWith('floor:')) {
      const floorId = audience.slice('floor:'.length)
      const floor = building?.floors.find((f) => f.id === floorId)
      return {
        phones: allTenants.filter((t) => t.floorId === floorId).map((t) => t.phone),
        label: floor?.name ?? 'Floor',
      }
    }
    if (audience.startsWith('room:')) {
      const roomId = audience.slice('room:'.length)
      return {
        phones: allTenants.filter((t) => t.roomId === roomId).map((t) => t.phone),
        label: allTenants.find((t) => t.roomId === roomId)
          ? `Room ${allTenants.find((t) => t.roomId === roomId)?.roomNumber}`
          : 'Room',
      }
    }
    return { phones: [], label: 'Unknown' }
  }

  const mutation = useMutation({
    mutationFn: sendBroadcast,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (result.recipientCount === 0) {
        toast.warning('No tenants matched this audience — nothing was sent.')
      } else if (result.deliveredCount === result.recipientCount) {
        toast.success(`Sent to ${result.deliveredCount} tenant${result.deliveredCount === 1 ? '' : 's'}`)
      } else {
        toast.warning(`Delivered to ${result.deliveredCount}/${result.recipientCount} — some numbers failed`)
      }
      reset()
      onOpenChange(false)
    },
    onError: () => toast.error('Could not send the broadcast. Please try again.'),
  })

  const onSubmit = (values: BroadcastFormValues) => {
    const { phones, label } = resolveRecipients(values.audience)
    mutation.mutate({ message: values.message, audience: label, recipients: phones })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Megaphone className="size-4" />
            Broadcast a Message
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-8">
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Controller
              name="audience"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {audienceGroups.general.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {audienceGroups.floors.length > 0 ? (
                      <SelectGroup>
                        <SelectLabel>By Floor</SelectLabel>
                        {audienceGroups.floors.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                    {audienceGroups.rooms.length > 0 ? (
                      <SelectGroup>
                        <SelectLabel>By Room</SelectLabel>
                        {audienceGroups.rooms.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={5} placeholder="Write your message..." {...register('message')} />
            {errors.message ? <p className="text-xs text-danger">{errors.message.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Send Broadcast
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
