import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { deleteFloor } from '../services/building.service'
import type { Floor } from '../types'

interface DeleteFloorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floor: Floor | null
  onDeleted?: () => void
}

export function DeleteFloorDialog({ open, onOpenChange, floor, onDeleted }: DeleteFloorDialogProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteFloor(floor!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['building'] })
      toast.success('Floor deleted')
      onOpenChange(false)
      onDeleted?.()
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete the floor. Please try again.'),
  })

  const roomCount = floor?.rooms.length ?? 0

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${floor?.name}?`}
      description={
        roomCount > 0
          ? `This removes ${roomCount} room${roomCount === 1 ? '' : 's'} and all their beds. This can't be undone.`
          : "This can't be undone."
      }
      confirmLabel="Delete"
      isPending={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  )
}
