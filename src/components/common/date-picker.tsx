import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  disableFuture?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

function toIsoDate(date: Date): string {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

export function DatePicker({
  value,
  onChange,
  disableFuture = true,
  disabled = false,
  placeholder = 'Pick a date',
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <Popover open={open && !disabled} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="size-4" />
          {selected
            ? selected.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) onChange(toIsoDate(date))
            setOpen(false)
          }}
          disabled={disableFuture ? { after: new Date() } : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
