import { useEffect, useState } from 'react'
import { PartyPopper, Sparkles, Users, Wallet } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import { useBuildingData } from '@/features/building/hooks/use-building-data'

export const WELCOME_SEEN_KEY = 'staygrid.welcomeSeen'
const SEEN_KEY = WELCOME_SEEN_KEY

export function WelcomeDrawer() {
  const { user } = useAuth()
  const { data: building } = useBuildingData()
  const [open, setOpen] = useState(false)
  const ownerFirstName = building?.building.ownerName?.split(' ')[0] || user?.name.split(' ')[0]

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY) !== 'true') {
      setOpen(true)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, 'true')
    setOpen(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss()
      }}
    >
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PartyPopper className="size-6" />
          </div>
          <SheetTitle className="text-center text-lg">
            {ownerFirstName ? `Welcome, ${ownerFirstName}!` : 'Welcome to StayGrid'}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <p className="text-center text-sm text-muted-foreground">
            Your building is set up. Here's how to get started.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="size-4" />
              </span>
              <span>Add tenants and assign them to rooms from the Building tab</span>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                <Wallet className="size-4" />
              </span>
              <span>Record rent payments and expenses right from the Dashboard</span>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                <Sparkles className="size-4" />
              </span>
              <span>Everything you add is saved automatically — no setup needed</span>
            </li>
          </ul>
          <Button className="w-full" onClick={dismiss}>
            Let's go
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
