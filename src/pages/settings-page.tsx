import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import {
  Building2,
  Check,
  ChevronRight,
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
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { SetPinSheet } from '@/features/settings/components/set-pin-sheet'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { clearAccountData, clearAppData } from '@/features/onboarding/services/onboarding.service'
import { applyThemeColor, getStoredThemeColor, themeColorPresets } from '@/constants/theme-colors'
import { isBiometricAvailable, registerBiometricCredential } from '@/lib/biometric-auth'
import { useAuth } from '@/providers/auth-provider'
import { useAppLockStore } from '@/store/app-lock-store'
import { usePageTitle } from '@/hooks/use-page-title'

export function SettingsPage() {
  const navigate = useNavigate()
  usePageTitle('Settings', () => navigate(-1))
  const queryClient = useQueryClient()
  const { resolvedTheme, setTheme } = useTheme()
  const { data, refetch } = useBuildingData()
  const { user, isDemoMode, logout } = useAuth()
  const [clearDataOpen, setClearDataOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const appLockEnabled = useAppLockStore((s) => s.enabled)
  const biometricEnabled = useAppLockStore((s) => s.biometricEnabled)
  const disableAppLock = useAppLockStore((s) => s.disable)
  const setBiometricEnabled = useAppLockStore((s) => s.setBiometricEnabled)
  const [setPinOpen, setSetPinOpen] = useState(false)
  const [disableLockOpen, setDisableLockOpen] = useState(false)
  const [themeColor, setThemeColor] = useState(() => getStoredThemeColor())
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState(false)

  useEffect(() => {
    void isBiometricAvailable().then(setBiometricSupported)
  }, [])

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

  const handleBiometricToggle = async (checked: boolean) => {
    if (!checked) {
      setBiometricEnabled(false)
      return
    }
    setIsRegisteringBiometric(true)
    const credentialId = await registerBiometricCredential(user?.id ?? 'owner')
    setIsRegisteringBiometric(false)
    if (credentialId) {
      setBiometricEnabled(true, credentialId)
      toast.success('Biometric unlock enabled')
    } else {
      toast.error('Could not set up biometric unlock. Please try again.')
    }
  }

  return (
    <PullToRefresh onRefresh={refetch}>
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
                {resolvedTheme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">Appearance</span>
              <Select value={resolvedTheme ?? 'light'} onValueChange={setTheme}>
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
              <div className="flex items-center gap-2">
                {themeColorPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    aria-label={preset.label}
                    onClick={() => {
                      applyThemeColor(preset.id, resolvedTheme === 'dark')
                      setThemeColor(preset.id)
                    }}
                    className="press-scale relative flex size-6 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-card transition-shadow"
                    style={
                      {
                        backgroundColor: preset.swatch,
                        '--tw-ring-color': themeColor === preset.id ? preset.swatch : 'transparent',
                      } as CSSProperties
                    }
                  >
                    {themeColor === preset.id ? <Check className="size-3.5 text-white" strokeWidth={3} /> : null}
                  </button>
                ))}
              </div>
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

            {appLockEnabled && biometricSupported ? (
              <div className="flex w-full items-center gap-2.5 py-3 pl-11">
                <span className="flex-1 text-sm font-medium text-foreground">Unlock with Biometrics</span>
                <Switch
                  checked={biometricEnabled}
                  disabled={isRegisteringBiometric}
                  onCheckedChange={(checked) => void handleBiometricToggle(checked)}
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => navigate('/settings/whatsapp')}
              className="flex w-full items-center gap-2.5 py-3 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted p-1.5">
                <img src={whatsappLogo} alt="" className="size-full" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">Connect WhatsApp</span>
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
        <span>Made by Ravi</span>
      </div>

      <ConfirmSheet
        open={clearDataOpen}
        onOpenChange={setClearDataOpen}
        title="Clear all app data?"
        description="This permanently deletes your tenants, floors, houses, payments, expenses, and every other record. Your building profile stays as-is, so you won't have to set up again. This can't be undone."
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
        description="You won't need a PIN to open Jeevanam anymore."
        confirmLabel="Turn Off"
        destructive={false}
        onConfirm={() => {
          disableAppLock()
          setDisableLockOpen(false)
        }}
      />
    </div>
    </PullToRefresh>
  )
}
