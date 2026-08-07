import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, ChevronLeft, ChevronRight, Home, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/common/empty-state'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { reassignTenant } from '../services/tenants.service'
import type { Floor } from '@/features/building/types'
import type { Tenant } from '@/types/domain'

interface ReassignTenantSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant | null
}

type Step = 'floor' | 'house'

export function ReassignTenantSheet({ open, onOpenChange, tenant }: ReassignTenantSheetProps) {
  const queryClient = useQueryClient()
  const { data: building } = useBuildingData()
  const [step, setStep] = useState<Step>('floor')
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)

  useEffect(() => {
    if (open) {
      setStep('floor')
      setSelectedFloor(null)
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: (houseId: string) => reassignTenant(tenant!.id, houseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['building'] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      toast.success('Tenant reassigned')
      onOpenChange(false)
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not reassign the tenant. Please try again.'),
  })

  if (!tenant) return null

  const floors = building?.floors ?? []
  const floorsWithVacancy = floors.filter((f) => f.houses.some((h) => h.tenant === null))
  const housesWithVacancy = (selectedFloor?.houses ?? []).filter((h) => h.tenant === null)

  const title = step === 'floor' ? 'Select Floor' : 'Select House'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {step !== 'floor' ? (
              <button
                type="button"
                onClick={() => setStep('floor')}
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <ChevronLeft className="size-4" />
              </button>
            ) : null}
            {title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2 px-4 pb-8">
          <p className="mb-1 text-xs text-muted-foreground">
            Reassigning {tenant.name} — currently{' '}
            {tenant.houseNumber ? `${tenant.floorName} · House ${tenant.houseNumber}` : 'Not Allotted'}
          </p>

          {step === 'floor' ? (
            floorsWithVacancy.length === 0 ? (
              <EmptyState icon={Building2} title="No vacant houses" description="Every house is currently occupied." />
            ) : (
              floorsWithVacancy.map((floor) => (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => {
                    setSelectedFloor(floor)
                    setStep('house')
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-foreground">{floor.name}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))
            )
          ) : (
            housesWithVacancy.map((house) => (
              <button
                key={house.id}
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(house.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60"
              >
                <Home className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-foreground">House {house.houseNumber}</span>
                {mutation.isPending && mutation.variables === house.id ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
