import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Building2, CircleDashed, Pencil, Plus, Trash2, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { RoomGrid } from '@/features/building/components/room-grid'
import { RoomDetailSheet } from '@/features/building/components/room-detail-sheet'
import { AddFloorSheet } from '@/features/building/components/add-floor-sheet'
import { DeleteFloorDialog } from '@/features/building/components/delete-floor-dialog'
import { AddRoomSheet } from '@/features/building/components/add-room-sheet'
import { DeleteRoomDialog } from '@/features/building/components/delete-room-dialog'
import { AllotTenantSheet } from '@/features/building/components/allot-tenant-sheet'
import { useUiStore } from '@/store/ui-store'
import { usePageTitle } from '@/hooks/use-page-title'
import type { Bed, Floor, Room } from '@/features/building/types'

export function BuildingPage() {
  const navigate = useNavigate()
  usePageTitle('Building', () => navigate(-1))
  const { data, isLoading, isError, refetch } = useBuildingData()
  const selectedRoomId = useUiStore((s) => s.selectedRoomId)
  const setSelectedRoomId = useUiStore((s) => s.setSelectedRoomId)
  const [allotTarget, setAllotTarget] = useState<{ room: Room; bed: Bed } | null>(null)
  const [addFloorOpen, setAddFloorOpen] = useState(false)
  const [editFloor, setEditFloor] = useState<Floor | null>(null)
  const [deleteFloorTarget, setDeleteFloorTarget] = useState<Floor | null>(null)
  const [addRoomFloor, setAddRoomFloor] = useState<Floor | null>(null)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<Room | null>(null)
  const [expandedFloors, setExpandedFloors] = useState<string[]>([])
  const knownFloorIds = useRef(new Set<string>())

  useEffect(() => {
    if (!data) return
    const newIds = data.floors.map((f) => f.id).filter((id) => !knownFloorIds.current.has(id))
    if (newIds.length === 0) return
    for (const id of newIds) knownFloorIds.current.add(id)
    setExpandedFloors((current) => [...current, ...newIds])
  }, [data])

  const activeRoomWithFloor = useMemo(() => {
    if (!data || !selectedRoomId) return null
    for (const floor of data.floors) {
      const room = floor.rooms.find((r) => r.id === selectedRoomId)
      if (room) return { room, floorName: floor.name }
    }
    return null
  }, [data, selectedRoomId])

  const nextFloorNumber = useMemo(
    () => (data && data.floors.length > 0 ? Math.max(...data.floors.map((f) => f.floorNumber)) + 1 : 0),
    [data],
  )

  const kpis = useMemo(() => {
    if (!data) return { occupied: 0, partial: 0, vacant: 0 }
    let occupied = 0
    let partial = 0
    let vacant = 0
    for (const floor of data.floors) {
      for (const room of floor.rooms) {
        if (room.occupancyStatus === 'occupied') occupied += 1
        else if (room.occupancyStatus === 'partial') partial += 1
        else vacant += 1
      }
    }
    return { occupied, partial, vacant }
  }, [data])

  const roomSheetFloorId = editRoom?.floorId ?? addRoomFloor?.id ?? null

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-4">
        {isError ? (
          <ErrorState title="Couldn't load building" description="Please try again." onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <BuildingSkeleton />
        ) : data.floors.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No floors yet"
            description="Add your first floor to start setting up rooms."
            action={<Button onClick={() => setAddFloorOpen(true)}>Add Floor</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              <KpiTile label="Occupied" value={kpis.occupied} icon={Users} tone="text-success" />
              <KpiTile label="Partial" value={kpis.partial} icon={CircleDashed} tone="text-warning" />
              <KpiTile label="Vacant" value={kpis.vacant} icon={BedDouble} tone="text-neutral-foreground" />
              <button
                type="button"
                onClick={() => setAddFloorOpen(true)}
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-card py-2.5 text-primary transition-colors hover:bg-accent"
              >
                <Plus className="size-4" />
                <span className="text-[11px] font-medium">Add Floor</span>
              </button>
            </div>

            <Accordion type="multiple" value={expandedFloors} onValueChange={setExpandedFloors} className="space-y-2">
              {data.floors.map((floor) => (
                <AccordionItem
                  key={floor.id}
                  value={floor.id}
                  className="rounded-xl border border-border bg-card px-3 last:border-b"
                >
                  <div className="flex items-center gap-1 py-1.5">
                    <span className="flex flex-1 items-baseline gap-2 py-1.5">
                      <span className="text-sm font-semibold text-foreground">{floor.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {floor.rooms.length} room{floor.rooms.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setEditFloor(floor)}
                        aria-label="Edit floor"
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteFloorTarget(floor)}
                        aria-label="Delete floor"
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      <AccordionTrigger className="w-auto p-1.5 hover:no-underline" />
                    </div>
                  </div>

                  <AccordionContent>
                    {floor.rooms.length === 0 ? (
                      <EmptyState
                        icon={Building2}
                        title="No rooms on this floor"
                        description="Add a room to start tracking occupancy."
                        action={
                          <Button size="sm" onClick={() => setAddRoomFloor(floor)}>
                            Add Room
                          </Button>
                        }
                      />
                    ) : (
                      <RoomGrid
                        rooms={floor.rooms}
                        onSelectRoom={setSelectedRoomId}
                        onAddRoom={() => setAddRoomFloor(floor)}
                      />
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <RoomDetailSheet
              room={activeRoomWithFloor?.room ?? null}
              floorName={activeRoomWithFloor?.floorName ?? ''}
              open={selectedRoomId !== null}
              onOpenChange={(open) => {
                if (!open) setSelectedRoomId(null)
              }}
              onAssignTenant={(room, bed) => {
                setSelectedRoomId(null)
                setAllotTarget({ room, bed })
              }}
              onViewTenant={(tenantId) => navigate(`/tenants/${tenantId}`)}
              onEditRoom={(room) => {
                setSelectedRoomId(null)
                setEditRoom(room)
              }}
              onDeleteRoom={(room) => {
                setSelectedRoomId(null)
                setDeleteRoomTarget(room)
              }}
            />
          </>
        )}

        <AddFloorSheet
          open={addFloorOpen || editFloor !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddFloorOpen(false)
              setEditFloor(null)
            }
          }}
          nextFloorNumber={nextFloorNumber}
          existingFloor={editFloor}
        />

        <DeleteFloorDialog
          open={deleteFloorTarget !== null}
          onOpenChange={(open) => !open && setDeleteFloorTarget(null)}
          floor={deleteFloorTarget}
        />

        <AddRoomSheet
          open={addRoomFloor !== null || editRoom !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddRoomFloor(null)
              setEditRoom(null)
            }
          }}
          floorId={roomSheetFloorId}
          floorLabel={editRoom ? undefined : addRoomFloor?.name}
          existingRoom={editRoom}
        />

        <DeleteRoomDialog
          open={deleteRoomTarget !== null}
          onOpenChange={(open) => !open && setDeleteRoomTarget(null)}
          room={deleteRoomTarget}
        />

        <AllotTenantSheet
          open={allotTarget !== null}
          onOpenChange={(open) => {
            if (!open) setAllotTarget(null)
          }}
          room={allotTarget?.room ?? null}
          bed={allotTarget?.bed ?? null}
        />
      </div>
    </PullToRefresh>
  )
}

function KpiTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card py-2.5">
      <span className="flex items-center gap-1.5">
        <Icon className={`size-3.5 ${tone}`} />
        <span className="font-numeric text-sm font-semibold text-foreground">{value}</span>
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

function BuildingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
