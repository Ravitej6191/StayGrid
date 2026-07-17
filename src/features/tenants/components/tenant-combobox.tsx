import { useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Tenant } from '@/types/domain'

interface TenantComboboxProps {
  tenants: Tenant[]
  value: string
  onChange: (tenantId: string) => void
}

export function TenantCombobox({ tenants, value, onChange }: TenantComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = tenants.find((t) => t.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selected ? `${selected.name} · Room ${selected.roomNumber}` : 'Search tenant by name, phone, room'}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tenants..." />
          <CommandList>
            <CommandEmpty>No tenant found.</CommandEmpty>
            <CommandGroup>
              {tenants.map((tenant) => (
                <CommandItem
                  key={tenant.id}
                  value={`${tenant.name} ${tenant.phone} ${tenant.roomNumber}`}
                  onSelect={() => {
                    onChange(tenant.id)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('size-4', value === tenant.id ? 'opacity-100' : 'opacity-0')} />
                  <div className="min-w-0">
                    <p className="truncate">{tenant.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Room {tenant.roomNumber} · {tenant.phone}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
