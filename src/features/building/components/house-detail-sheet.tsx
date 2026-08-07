import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatusChip } from '@/components/common/status-chip'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { unassignTenant } from '@/features/tenants/services/tenants.service'
import { rentStatusTokens } from '@/constants/status'
import { formatCurrency } from '@/utils/format'
import { houseTypeLabel } from '../types'
import type { House } from '../types'
import type { Tenant } from '@/types/domain'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

interface HouseDetailSheetProps {
  house: House | null
  floorName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssignTenant: (house: House) => void
  onViewTenant: (tenantId: string) => void
  onEditHouse: (house: House) => void
  onDeleteHouse: (house: House) => void
}

export function HouseDetailSheet({
  house,
  floorName,
  open,
  onOpenChange,
  onAssignTenant,
  onViewTenant,
  onEditHouse,
  onDeleteHouse,
}: HouseDetailSheetProps) {
  if (!house) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle>House {house.houseNumber}</SheetTitle>
              <p className="text-xs text-muted-foreground">{floorName}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 pr-6">
              <Button variant="outline" size="icon-sm" aria-label="Edit house" onClick={() => onEditHouse(house)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Delete house"
                className="text-danger hover:text-danger"
                onClick={() => onDeleteHouse(house)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8">
          <HouseFacts house={house} />

          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Tenant</p>
            {house.tenant ? (
              <TenantSlot tenant={house.tenant} onView={() => onViewTenant(house.tenant!.id)} />
            ) : (
              <button
                type="button"
                onClick={() => onAssignTenant(house)}
                className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border/70 px-3 py-3 text-left text-sm text-primary transition-colors hover:bg-accent"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <UserPlus className="size-4" />
                </span>
                Allot Tenant
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function HouseFacts({ house }: { house: House }) {
  const facts = [
    { label: 'House', value: house.houseNumber },
    { label: 'Type', value: houseTypeLabel(house.houseType) },
  ]

  const utilityFacts = [
    { label: 'Gas Connection No.', value: house.gasConnectionNumber },
    { label: 'Electricity Bill No.', value: house.electricityBillNumber },
  ].filter((fact) => fact.value)

  return (
    <div className="space-y-3">
      <div className="flex items-stretch divide-x divide-border rounded-lg bg-muted/50 p-3 text-sm">
        {facts.map((fact) => (
          <div key={fact.label} className="flex-1 px-3 first:pl-0 last:pr-0">
            <p className="text-xs text-muted-foreground">{fact.label}</p>
            <p className="truncate font-medium text-foreground">{fact.value}</p>
          </div>
        ))}
      </div>

      {utilityFacts.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-border/70 p-3 text-sm">
          {utilityFacts.map((fact) => (
            <div key={fact.label}>
              <p className="text-xs text-muted-foreground">{fact.label}</p>
              <p className="truncate font-medium text-foreground">{fact.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function TenantSlot({ tenant, onView }: { tenant: Tenant; onView: () => void }) {
  const queryClient = useQueryClient()
  const [removeOpen, setRemoveOpen] = useState(false)
  const rentToken = rentStatusTokens[tenant.rentStatus]

  const removeMutation = useMutation({
    mutationFn: () => unassignTenant(tenant.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['building'] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      toast.success('Tenant removed from the house')
      setRemoveOpen(false)
    },
    onError: () => toast.error('Could not remove the tenant. Please try again.'),
  })

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/60 p-3">
      <button type="button" onClick={onView} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar className="size-10">
          {tenant.photoUrl ? <AvatarImage src={tenant.photoUrl} alt={tenant.name} /> : null}
          <AvatarFallback>{initials(tenant.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{tenant.name}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(tenant.rent)}/mo</p>
        </div>
      </button>
      <StatusChip token={rentToken} />
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Remove from house"
        className="text-danger hover:text-danger"
        onClick={() => setRemoveOpen(true)}
      >
        <UserMinus className="size-4" />
      </Button>

      <ConfirmSheet
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove from this house?"
        description={`${tenant.name} stays on as a tenant but won't be assigned to a house. You can allot them again anytime.`}
        confirmLabel="Remove"
        isPending={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate()}
      />
    </div>
  )
}
