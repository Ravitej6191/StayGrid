import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { vacateTenant } from '../services/tenants.service'
import type { Tenant } from '@/types/domain'

interface VacateTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant | null
  onVacated?: () => void
}

export function VacateTenantDialog({ open, onOpenChange, tenant, onVacated }: VacateTenantDialogProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => vacateTenant(tenant!.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['building'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
      ])
      toast.success('Tenant vacated')
      onOpenChange(false)
      onVacated?.()
    },
    onError: () => toast.error('Could not vacate the tenant. Please try again.'),
  })

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Vacate ${tenant?.name}?`}
      description="Their bed will become vacant and they'll move to Past Tenants. Payment history is kept."
      confirmLabel="Vacate"
      isPending={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  )
}
