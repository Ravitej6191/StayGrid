import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { deleteHouse } from '../services/building.service'
import type { House } from '../types'

interface DeleteHouseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  house: House | null
}

export function DeleteHouseDialog({ open, onOpenChange, house }: DeleteHouseDialogProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteHouse(house!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['building'] })
      toast.success('House deleted')
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete the house. Please try again.'),
  })

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete House ${house?.houseNumber}?`}
      description="This can't be undone."
      confirmLabel="Delete"
      isPending={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  )
}
