import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Home, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { HouseGrid } from '@/features/building/components/house-grid'
import { HouseDetailSheet } from '@/features/building/components/house-detail-sheet'
import { AddFloorSheet } from '@/features/building/components/add-floor-sheet'
import { DeleteFloorDialog } from '@/features/building/components/delete-floor-dialog'
import { AddHouseSheet } from '@/features/building/components/add-house-sheet'
import { DeleteHouseDialog } from '@/features/building/components/delete-house-dialog'
import { AllotTenantSheet } from '@/features/building/components/allot-tenant-sheet'
import { useUiStore } from '@/store/ui-store'
import { usePageTitle } from '@/hooks/use-page-title'
import type { Floor, House } from '@/features/building/types'

export function BuildingPage() {
  const navigate = useNavigate()
  usePageTitle('Building', () => navigate(-1))
  const { data, isLoading, isError, refetch } = useBuildingData()
  const selectedHouseId = useUiStore((s) => s.selectedHouseId)
  const setSelectedHouseId = useUiStore((s) => s.setSelectedHouseId)
  const [allotTarget, setAllotTarget] = useState<House | null>(null)
  const [addFloorOpen, setAddFloorOpen] = useState(false)
  const [editFloor, setEditFloor] = useState<Floor | null>(null)
  const [deleteFloorTarget, setDeleteFloorTarget] = useState<Floor | null>(null)
  const [addHouseFloor, setAddHouseFloor] = useState<Floor | null>(null)
  const [editHouse, setEditHouse] = useState<House | null>(null)
  const [deleteHouseTarget, setDeleteHouseTarget] = useState<House | null>(null)
  const [expandedFloors, setExpandedFloors] = useState<string[]>([])
  const knownFloorIds = useRef(new Set<string>())

  useEffect(() => {
    if (!data) return
    const newIds = data.floors.map((f) => f.id).filter((id) => !knownFloorIds.current.has(id))
    if (newIds.length === 0) return
    for (const id of newIds) knownFloorIds.current.add(id)
    setExpandedFloors((current) => [...current, ...newIds])
  }, [data])

  const activeHouseWithFloor = useMemo(() => {
    if (!data || !selectedHouseId) return null
    for (const floor of data.floors) {
      const house = floor.houses.find((h) => h.id === selectedHouseId)
      if (house) return { house, floorName: floor.name }
    }
    return null
  }, [data, selectedHouseId])

  const nextFloorNumber = useMemo(
    () => (data && data.floors.length > 0 ? Math.max(...data.floors.map((f) => f.floorNumber)) + 1 : 0),
    [data],
  )

  const kpis = useMemo(() => {
    if (!data) return { occupied: 0 }
    let occupied = 0
    for (const floor of data.floors) {
      for (const house of floor.houses) {
        if (house.occupancyStatus === 'occupied') occupied += 1
      }
    }
    return { occupied }
  }, [data])

  const houseSheetFloorId = editHouse?.floorId ?? addHouseFloor?.id ?? null

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
            description="Add your first floor to start setting up houses."
            action={<Button onClick={() => setAddFloorOpen(true)}>Add Floor</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              <KpiTile label="Occupied" value={kpis.occupied} icon={Home} tone="text-success" />
              <KpiTile
                label="Tenants"
                value={kpis.occupied}
                icon={Users}
                tone="text-info"
                onClick={() => navigate('/tenants')}
              />
              <button
                type="button"
                onClick={() => setAddFloorOpen(true)}
                className="press-scale flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-primary/30 bg-card py-2.5 text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-sm"
              >
                <Plus className="size-4" />
                <span className="text-[11px] font-medium">Add Floor</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/tenants/new')}
                className="press-scale flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-primary/30 bg-card py-2.5 text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-sm"
              >
                <UserPlus className="size-4" />
                <span className="text-[11px] font-medium">Add Tenant</span>
              </button>
            </div>

            <Accordion type="multiple" value={expandedFloors} onValueChange={setExpandedFloors} className="space-y-2">
              {data.floors.map((floor) => (
                <AccordionItem
                  key={floor.id}
                  value={floor.id}
                  className="rounded-xl border border-border bg-card px-3 shadow-sm transition-shadow duration-300 last:border-b hover:shadow-md"
                >
                  <div className="flex items-center gap-1 py-1.5">
                    <span className="flex flex-1 items-baseline gap-2 py-1.5">
                      <span className="text-sm font-semibold text-foreground">{floor.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {floor.houses.length} house{floor.houses.length === 1 ? '' : 's'}
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
                      <button
                        type="button"
                        onClick={() => setAddHouseFloor(floor)}
                        aria-label="Add house"
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <AccordionTrigger className="w-auto p-1.5 hover:no-underline" />
                    </div>
                  </div>

                  <AccordionContent>
                    {floor.houses.length === 0 ? (
                      <EmptyState
                        icon={Building2}
                        title="No houses on this floor"
                        description="Tap the + above to add a house and start tracking occupancy."
                      />
                    ) : (
                      <HouseGrid houses={floor.houses} onSelectHouse={setSelectedHouseId} />
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <HouseDetailSheet
              house={activeHouseWithFloor?.house ?? null}
              floorName={activeHouseWithFloor?.floorName ?? ''}
              open={selectedHouseId !== null}
              onOpenChange={(open) => {
                if (!open) setSelectedHouseId(null)
              }}
              onAssignTenant={(house) => {
                setSelectedHouseId(null)
                setAllotTarget(house)
              }}
              onViewTenant={(tenantId) => navigate(`/tenants/${tenantId}`)}
              onEditHouse={(house) => {
                setSelectedHouseId(null)
                setEditHouse(house)
              }}
              onDeleteHouse={(house) => {
                setSelectedHouseId(null)
                setDeleteHouseTarget(house)
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

        <AddHouseSheet
          open={addHouseFloor !== null || editHouse !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddHouseFloor(null)
              setEditHouse(null)
            }
          }}
          floorId={houseSheetFloorId}
          floorLabel={editHouse ? undefined : addHouseFloor?.name}
          existingHouse={editHouse}
        />

        <DeleteHouseDialog
          open={deleteHouseTarget !== null}
          onOpenChange={(open) => !open && setDeleteHouseTarget(null)}
          house={deleteHouseTarget}
        />

        <AllotTenantSheet
          open={allotTarget !== null}
          onOpenChange={(open) => {
            if (!open) setAllotTarget(null)
          }}
          house={allotTarget}
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
  onClick,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="press-scale flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card py-2.5 shadow-sm transition-shadow duration-300 hover:shadow-md disabled:pointer-events-none"
    >
      <span className="flex items-center gap-1.5">
        <Icon className={`size-3.5 ${tone}`} />
        <span className="font-numeric text-sm font-semibold text-foreground">{value}</span>
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </button>
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
