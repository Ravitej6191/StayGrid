import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import {
  Bell,
  Building2,
  ChevronRight,
  Globe,
  Lock,
  LogOut,
  Moon,
  Palette,
  Pencil,
  ShieldAlert,
  Sun,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import whatsappLogo from '@/assets/whatsapp-logo.svg'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { SetPinSheet } from '@/features/settings/components/set-pin-sheet'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { clearAccountData, clearAppData } from '@/features/onboarding/services/onboarding.service'
import { applyThemeColor, getStoredThemeColor, themeColorPresets } from '@/constants/theme-colors'
import { NOTIFICATIONS_ENABLED_KEY, areNotificationsEnabled } from '@/lib/notification-prefs'
import { APP_VERSION } from '@/constants/app'
import { useAuth } from '@/providers/auth-provider'
import { useAppLockStore } from '@/store/app-lock-store'
import { usePageTitle } from '@/hooks/use-page-title'

const languageOptions = [
  { value: 'en', label: 'English', comingSoon: false },
  { value: 'hi', label: 'Hindi', comingSoon: true },
  { value: 'te', label: 'Telugu', comingSoon: true },
  { value: 'ta', label: 'Tamil', comingSoon: true },
]

export function SettingsPage() {
  const navigate = useNavigate()
  usePageTitle('Settings', () => navigate(-1))
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const { data } = useBuildingData()
  const { user, isDemoMode, logout } = useAuth()
  const [clearDataOpen, setClearDataOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => areNotificationsEnabled())
  const appLockEnabled = useAppLockStore((s) => s.enabled)
  const disableAppLock = useAppLockStore((s) => s.disable)
  const [setPinOpen, setSetPinOpen] = useState(false)
  const [disableLockOpen, setDisableLockOpen] = useState(false)
  const [themeColor, setThemeColor] = useState(() => getStoredThemeColor())
  const [language, setLanguage] = useState('en')

  const clearDataMutation = useMutation({
    mutationFn: clearAppData,
    onSuccess: () => {
      queryClient.clear()
      toast.success('App data cleared')
    },
    onError: () => toast.error('Could not clear your data. Please try again.'),
  })

  const deleteAccountMutation = useMutation({
    mutationFn: clearAccountData,
    onSuccess: async () => {
      await logout()
      toast.success('Account deleted')
    },
    onError: () => toast.error('Could not delete your account. Please try again.'),
  })

  return (
    <div className="space-y-5">
      <Card className="border-border">
        <CardContent className="space-y-4">
          {data ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{data.building.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => navigate('/settings/edit-profile')}
                  aria-label="Edit profile"
                >
                  <Pencil className="size-4" />
                </Button>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="truncate font-medium text-foreground">{data.building.ownerName || user?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="truncate font-medium text-foreground">{data.building.contactPhone || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium text-foreground">
                    {data.building.address ? `${data.building.address}, ` : ''}
                    {data.building.city}
                    {data.building.state ? `, ${data.building.state}` : ''}
                    {data.building.pincode ? ` - ${data.building.pincode}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">GST</p>
                  <p className="truncate font-medium text-foreground">{data.building.gstNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PAN</p>
                  <p className="truncate font-medium text-foreground">{data.building.panNumber || '—'}</p>
                </div>
              </div>
            </>
          ) : (
            <Skeleton className="h-9 w-full" />
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Preferences</p>

          <div className="-my-1 divide-y divide-border">
            <div className="flex w-full items-center gap-2.5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">Appearance</span>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger size="sm" className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="light">
                    <Sun className="size-4" />
                    Light
                  </SelectItem>
                  <SelectItem value="dark">
                    <Moon className="size-4" />
                    Dark
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-full items-center gap-2.5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Palette className="size-4" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">Theme Color</span>
              <Select
                value={themeColor}
                onValueChange={(value) => {
                  applyThemeColor(value)
                  setThemeColor(value)
                }}
              >
                <SelectTrigger size="sm" className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {themeColorPresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: preset.swatch } as CSSProperties}
                      />
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-full items-center gap-2.5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="size-4" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">Notifications</span>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={(checked) => {
                  setNotificationsEnabled(checked)
                  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(checked))
                }}
              />
            </div>

            <div className="flex w-full items-center gap-2.5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Globe className="size-4" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">Language</span>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger size="sm" className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} disabled={option.comingSoon}>
                      {option.label}
                      {option.comingSoon ? ' (Coming soon)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-full items-center gap-2.5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Lock className="size-4" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">App Lock</span>
              <Switch
                checked={appLockEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSetPinOpen(true)
                  } else {
                    setDisableLockOpen(true)
                  }
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => navigate('/settings/whatsapp')}
              className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-3 -mx-1.5 text-left transition-colors hover:bg-accent/60"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted p-1.5">
                <img src={whatsappLogo} alt="" className="size-full" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">WhatsApp Integration</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/settings/past-tenants')}
              className="flex w-full items-center gap-2.5 py-3 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="size-4" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">Past Tenants</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>

            {isDemoMode ? null : (
              <>
                <button
                  type="button"
                  onClick={() => setClearDataOpen(true)}
                  className="flex w-full items-center gap-2.5 py-3 text-left"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                    <Trash2 className="size-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground">Clear App Data</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteAccountOpen(true)}
                  className="flex w-full items-center gap-2.5 py-3 text-left"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                    <ShieldAlert className="size-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-danger">Delete Account</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full text-danger hover:text-danger"
        onClick={() => {
          void logout()
          toast.success('Signed out')
        }}
      >
        <LogOut className="size-4" />
        Log Out
      </Button>

      <div className="flex items-center justify-center gap-1.5 pb-4 text-center text-xs text-muted-foreground">
        <span>StayGrid v{APP_VERSION}</span>
        <span className="text-muted-foreground/40">·</span>
        <button
          type="button"
          onClick={() => navigate('/settings/privacy-policy')}
          className="underline underline-offset-2"
        >
          Privacy Policy
        </button>
        <span className="text-muted-foreground/40">·</span>
        <span>Made by Ravi</span>
      </div>

      <ConfirmSheet
        open={clearDataOpen}
        onOpenChange={setClearDataOpen}
        title="Clear all app data?"
        description="This permanently deletes your tenants, floors, rooms, payments, expenses, and every other record. Your building profile stays as-is, so you won't have to set up again. This can't be undone."
        confirmLabel="Clear Data"
        isPending={clearDataMutation.isPending}
        onConfirm={() => {
          clearDataMutation.mutate()
          setClearDataOpen(false)
        }}
      />

      <ConfirmSheet
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        title="Delete your account?"
        description="This permanently removes all your data — building, tenants, payments, expenses, everything — and signs you out. This can't be undone."
        confirmLabel="Delete Account"
        isPending={deleteAccountMutation.isPending}
        onConfirm={() => {
          deleteAccountMutation.mutate()
          setDeleteAccountOpen(false)
        }}
      />

      <SetPinSheet open={setPinOpen} onOpenChange={setSetPinOpen} />

      <ConfirmSheet
        open={disableLockOpen}
        onOpenChange={setDisableLockOpen}
        title="Turn off App Lock?"
        description="You won't need a PIN to open StayGrid anymore."
        confirmLabel="Turn Off"
        destructive={false}
        onConfirm={() => {
          disableAppLock()
          setDisableLockOpen(false)
        }}
      />
    </div>
  )
}
