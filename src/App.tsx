import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/providers/theme-provider'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider, useAuth } from '@/providers/auth-provider'
import { applyThemeColor, getStoredThemeColor } from '@/constants/theme-colors'
import { useAppLockStore } from '@/store/app-lock-store'
import { AppLockScreen } from '@/features/settings/components/app-lock-screen'
import { consumeCapturedAuthError } from '@/lib/auth-error-capture'
import { initNativeAuthListener } from '@/lib/native-auth'
import { router } from '@/app/router'

function AppGate() {
  const { isLoading, isAuthenticated } = useAuth()
  const { resolvedTheme } = useTheme()
  const isUnlocked = useAppLockStore((s) => s.isUnlocked)

  useEffect(() => {
    applyThemeColor(getStoredThemeColor())
  }, [resolvedTheme])

  useEffect(() => {
    const message = consumeCapturedAuthError()
    if (message) toast.error(message)
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    return initNativeAuthListener()
  }, [])

  // Only re-lock a session that's already signed in. Google sign-in
  // backgrounds the app to show the account picker, which would otherwise
  // fire this same event mid-login and show the lock screen before the
  // sign-in has even finished.
  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && isAuthenticated) useAppLockStore.getState().lock()
    })
    return () => {
      void listenerPromise.then((listener) => listener.remove())
    }
  }, [isAuthenticated])

  if (isLoading) {
    return <div className="min-h-svh bg-background" />
  }

  if (isAuthenticated && !isUnlocked) {
    return <AppLockScreen />
  }

  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <AppGate />
            <Toaster position="top-center" richColors />
          </TooltipProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}
