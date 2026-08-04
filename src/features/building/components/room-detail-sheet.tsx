import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, Pencil, Phone, Trash2, UserMinus, UserPlus, UserRound } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/common/empty-state'
import { StatusChip } from '@/components/common/status-chip'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { unassignTenant } from '@/features/tenants/services/tenants.service'
import { rentStatusTokens } from '@/constants/status'
import { formatCurrency, formatDate } from '@/utils/format'
import { BedTile } from './bed-tile'
import { roomTypeLabel } from '../types'
import type { Bed, Room } from '../types'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

interface RoomDetailSheetProps {
  room: Room | null
  floorName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssignTenant: (room: Room, bed: Bed) => void
  onViewTenant: (tenantId: string) => void
  onEditRoom: (room: Room) => void
  onDeleteRoom: (room: Room) => void
}

export function RoomDetailSheet({
  room,
  floorName,
  open,
  onOpenChange,
  onAssignTenant,
  onViewTenant,
  onEditRoom,
  onDeleteRoom,
}: RoomDetailSheetProps) {
  const [activeBed, setActiveBed] = useState<Bed | null>(null)

  useEffect(() => {
    if (!open) setActiveBed(null)
  }, [open])

  if (!room) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            {activeBed ? (
              <button
                type="button"
                onClick={() => setActiveBed(null)}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <ChevronLeft className="size-4" />
              </button>
            ) : null}
            <span className="truncate">
              {activeBed ? `Bed ${activeBed.bedLabel} · Room ${room.roomNumber}` : `Room ${room.roomNumber}`}
            </span>
          </SheetTitle>
          {activeBed ? <p className="text-xs text-muted-foreground">{floorName}</p> : null}
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8">
          {activeBed ? (
            <motion.div key="bed" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.16 }}>
              <BedDetail bed={activeBed} room={room} onAssignTenant={onAssignTenant} onViewTenant={onViewTenant} />
            </motion.div>
          ) : (
            <motion.div key="room" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.16 }} className="space-y-5">
              <RoomFacts room={room} floorName={floorName} />

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Beds</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {room.beds.map((bed) => (
                    <BedTile key={bed.id} bed={bed} onSelect={() => setActiveBed(bed)} />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onEditRoom(room)}>
                  <Pencil className="size-4" />
                  Edit Room
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-danger hover:text-danger" onClick={() => onDeleteRoom(room)}>
                  <Trash2 className="size-4" />
                  Delete Room
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function RoomFacts({ room, floorName }: { room: Room; floorName: string }) {
  const facts = [
    { label: 'Floor', value: floorName },
    { label: 'Room', value: room.roomNumber },
    { label: 'Room Type', value: roomTypeLabel(room.roomType) },
    { label: 'Bed Count', value: String(room.beds.length) },
  ]

  return (
    <div className="flex items-stretch divide-x divide-border rounded-lg bg-muted/50 p-3 text-sm">
      {facts.map((fact) => (
        <div key={fact.label} className="flex-1 px-3 first:pl-0 last:pr-0">
          <p className="text-xs text-muted-foreground">{fact.label}</p>
          <p className="truncate font-medium text-foreground">{fact.value}</p>
        </div>
      ))}
    </div>
  )
}

interface BedDetailProps {
  bed: Bed
  room: Room
  onAssignTenant: (room: Room, bed: Bed) => void
  onViewTenant: (tenantId: string) => void
}

function BedDetail({ bed, room, onAssignTenant, onViewTenant }: BedDetailProps) {
  const queryClient = useQueryClient()
  const [removeOpen, setRemoveOpen] = useState(false)

  const removeMutation = useMutation({
    mutationFn: unassignTenant,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['building'] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      toast.success('Tenant removed from the room')
      setRemoveOpen(false)
    },
    onError: () => toast.error('Could not remove the tenant. Please try again.'),
  })

  if (!bed.tenant) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Vacant"
        description="Allot a tenant to start tracking rent here."
        action={
          <Button size="sm" onClick={() => onAssignTenant(room, bed)}>
            Allot Tenant
          </Button>
        }
      />
    )
  }

  const tenant = bed.tenant
  const rentToken = rentStatusTokens[tenant.rentStatus]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          {tenant.photoUrl ? <AvatarImage src={tenant.photoUrl} alt={tenant.name} /> : null}
          <AvatarFallback>{initials(tenant.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{tenant.name}</p>
          <p className="text-xs text-muted-foreground">{tenant.phone}</p>
        </div>
        <StatusChip token={rentToken} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Rent Amount</p>
          <p className="font-numeric font-semibold text-foreground">{formatCurrency(tenant.rent)}</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Joined</p>
          <p className="font-medium text-foreground">{formatDate(tenant.joiningDate)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="icon" asChild aria-label="Call tenant">
          <a href={`tel:${tenant.phone}`}>
            <Phone className="size-4" />
          </a>
        </Button>
        <Button variant="outline" size="icon" onClick={() => setRemoveOpen(true)} aria-label="Remove from room" className="text-danger hover:text-danger">
          <UserMinus className="size-4" />
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => onViewTenant(tenant.id)}>
          <UserRound className="size-4" />
          Profile
        </Button>
      </div>

      <ConfirmSheet
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove from this room?"
        description={`${tenant.name} stays on as a tenant but won't be assigned to a bed. You can allot them to a room again anytime.`}
        confirmLabel="Remove"
        isPending={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate(tenant.id)}
      />
    </div>
  )
}
