import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { digitsOnly } from '@/utils/format'
import { useAppLockStore } from '@/store/app-lock-store'

interface SetPinSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SetPinSheet({ open, onOpenChange }: SetPinSheetProps) {
  const enable = useAppLockStore((s) => s.enable)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPin('')
      setConfirmPin('')
      setError(null)
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) {
      setError('Enter a 4-digit PIN')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    enable(pin)
    toast.success('App Lock enabled')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lock className="size-4" />
            Set App Lock PIN
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-8">
          <p className="text-sm text-muted-foreground">
            Choose a 4-digit PIN. You'll need it to open StayGrid after the app is backgrounded or restarted.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pin}
              onChange={(e) => {
                setError(null)
                setPin(digitsOnly(e.target.value, 4))
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPin">Confirm PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => {
                setError(null)
                setConfirmPin(digitsOnly(e.target.value, 4))
              }}
            />
          </div>

          {error ? <p className="text-xs text-danger">{error}</p> : null}

          <Button type="submit" className="w-full">
            Enable App Lock
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
