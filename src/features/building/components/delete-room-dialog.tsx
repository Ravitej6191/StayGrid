import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { deleteRoom } from '../services/building.service'
import type { Room } from '../types'

interface DeleteRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
}

export function DeleteRoomDialog({ open, onOpenChange, room }: DeleteRoomDialogProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteRoom(room!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['building'] })
      toast.success('Room deleted')
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete the room. Please try again.'),
  })

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete Room ${room?.roomNumber}?`}
      description="This removes all its beds. This can't be undone."
      confirmLabel="Delete"
      isPending={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  )
}
