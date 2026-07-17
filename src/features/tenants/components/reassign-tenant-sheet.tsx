import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BedDouble, Building2, ChevronLeft, ChevronRight, DoorOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/common/empty-state'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { reassignTenant } from '../services/tenants.service'
import type { Floor, Room } from '@/features/building/types'
import type { Tenant } from '@/types/domain'

interface ReassignTenantSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant | null
}

type Step = 'floor' | 'room' | 'bed'

export function ReassignTenantSheet({ open, onOpenChange, tenant }: ReassignTenantSheetProps) {
  const queryClient = useQueryClient()
  const { data: building } = useBuildingData()
  const [step, setStep] = useState<Step>('floor')
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  useEffect(() => {
    if (open) {
      setStep('floor')
      setSelectedFloor(null)
      setSelectedRoom(null)
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: (bedId: string) => reassignTenant(tenant!.id, bedId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['building'] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      toast.success('Tenant reassigned')
      onOpenChange(false)
    },
    onError: () => toast.error('Could not reassign the tenant. Please try again.'),
  })

  if (!tenant) return null

  const floors = building?.floors ?? []
  const floorsWithVacancy = floors.filter((f) => f.rooms.some((r) => r.beds.some((b) => b.status === 'vacant')))
  const roomsWithVacancy = (selectedFloor?.rooms ?? []).filter((r) => r.beds.some((b) => b.status === 'vacant'))
  const vacantBeds = (selectedRoom?.beds ?? []).filter((b) => b.status === 'vacant')

  const title =
    step === 'floor' ? 'Select Floor' : step === 'room' ? 'Select Room' : 'Select Bed'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {step !== 'floor' ? (
              <button
                type="button"
                onClick={() => setStep(step === 'bed' ? 'room' : 'floor')}
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
            {tenant.roomNumber ? `${tenant.floorName} · Room ${tenant.roomNumber}` : 'Not Allotted'}
          </p>

          {step === 'floor' ? (
            floorsWithVacancy.length === 0 ? (
              <EmptyState icon={Building2} title="No vacant beds" description="Every room is currently full." />
            ) : (
              floorsWithVacancy.map((floor) => (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => {
                    setSelectedFloor(floor)
                    setStep('room')
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-foreground">{floor.name}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))
            )
          ) : step === 'room' ? (
            roomsWithVacancy.length === 0 ? (
              <EmptyState icon={DoorOpen} title="No vacant rooms" description="Pick a different floor." />
            ) : (
              roomsWithVacancy.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoom(room)
                    setStep('bed')
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <DoorOpen className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-foreground">Room {room.roomNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    {room.beds.filter((b) => b.status === 'vacant').length} vacant
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))
            )
          ) : (
            vacantBeds.map((bed) => (
              <button
                key={bed.id}
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(bed.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60"
              >
                <BedDouble className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-foreground">Bed {bed.bedLabel}</span>
                {mutation.isPending && mutation.variables === bed.id ? (
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
