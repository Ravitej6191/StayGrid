import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  Globe,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Pencil,
  ShieldAlert,
  Sun,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { cn } from '@/lib/utils'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { clearAccountData } from '@/features/onboarding/services/onboarding.service'
import { applyThemeColor, getStoredThemeColor, themeColorPresets } from '@/constants/theme-colors'
import { APP_VERSION } from '@/constants/app'
import { useAuth } from '@/providers/auth-provider'
import { usePageTitle } from '@/hooks/use-page-title'

const NOTIFICATIONS_KEY = 'staygrid.notificationsEnabled'
const APP_LOCK_KEY = 'staygrid.appLockEnabled'

function readBooleanPref(key: string, fallback: boolean) {
  const raw = localStorage.getItem(key)
  return raw === null ? fallback : raw === 'true'
}

export function SettingsPage() {
  usePageTitle('Settings')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const { data } = useBuildingData()
  const { user, isDemoMode, logout } = useAuth()
  const [clearDataOpen, setClearDataOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => readBooleanPref(NOTIFICATIONS_KEY, true))
  const [appLockEnabled, setAppLockEnabled] = useState(() => readBooleanPref(APP_LOCK_KEY, false))
  const [themeColor, setThemeColor] = useState(() => getStoredThemeColor())

  const clearDataMutation = useMutation({
    mutationFn: clearAccountData,
    onSuccess: () => {
      if (isDemoMode) {
        void logout()
        toast.success('App data cleared')
        return
      }
      queryClient.clear()
      toast.success('Data cleared. Let\'s set up your property again.')
      navigate('/onboarding', { replace: true })
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
      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
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
                    <p className="truncate text-xs text-muted-foreground">
                      {data.building.city || 'No city set'}
                    </p>
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

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardContent className="space-y-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Preferences</p>

          <div>
            <p className="mb-2 text-sm text-foreground">Appearance</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors',
                    theme === option.value && 'border-primary bg-primary/10 text-primary',
                  )}
                >
                  <option.icon className="size-4" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-foreground">Theme Color</p>
            <div className="flex gap-2.5">
              {themeColorPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-label={preset.label}
                  onClick={() => {
                    applyThemeColor(preset.id)
                    setThemeColor(preset.id)
                  }}
                  className="relative flex size-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-card transition-all"
                  style={
                    {
                      backgroundColor: preset.swatch,
                      '--tw-ring-color': themeColor === preset.id ? preset.swatch : 'transparent',
                    } as CSSProperties
                  }
                >
                  {themeColor === preset.id ? <Check className="size-4 text-white" /> : null}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="size-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Notifications</span>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={(checked) => {
                setNotificationsEnabled(checked)
                localStorage.setItem(NOTIFICATIONS_KEY, String(checked))
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Globe className="size-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Language</span>
            </div>
            <span className="text-sm text-muted-foreground">English</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="size-4 text-muted-foreground" />
              <span className="text-sm text-foreground">App Lock</span>
            </div>
            <Switch
              checked={appLockEnabled}
              onCheckedChange={(checked) => {
                setAppLockEnabled(checked)
                localStorage.setItem(APP_LOCK_KEY, String(checked))
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardContent className="space-y-1">
          <button
            type="button"
            onClick={() => navigate('/settings/whatsapp')}
            className="flex w-full items-center gap-2.5 py-1.5 text-left"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              <MessageCircle className="size-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">WhatsApp Integration</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <Separator />

          <button
            type="button"
            onClick={() => navigate('/settings/past-tenants')}
            className="flex w-full items-center gap-2.5 py-1.5 text-left"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="size-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">Past Tenants</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardContent className="space-y-1">
          <button
            type="button"
            onClick={() => setClearDataOpen(true)}
            className="flex w-full items-center gap-2.5 py-1.5 text-left"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
              <Trash2 className="size-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">Clear App Data</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <Separator />

          <button
            type="button"
            onClick={() => setDeleteAccountOpen(true)}
            className="flex w-full items-center gap-2.5 py-1.5 text-left"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
              <ShieldAlert className="size-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-danger">Delete Account</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
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
        <a href="#" className="underline underline-offset-2">
          Privacy Policy
        </a>
        <span className="text-muted-foreground/40">·</span>
        <span>Made by Ravi</span>
      </div>

      <ConfirmSheet
        open={clearDataOpen}
        onOpenChange={setClearDataOpen}
        title="Clear all app data?"
        description={
          isDemoMode
            ? 'This removes everything saved on this device and returns you to the login screen.'
            : "This permanently deletes your building, tenants, payments, and every other record, then takes you back to setup. This can't be undone."
        }
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
    </div>
  )
}
