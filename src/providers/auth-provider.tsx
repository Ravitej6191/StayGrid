import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DEMO_MODE_KEY, isSupabaseConfigured } from '@/config/env'
import { supabase } from '@/lib/supabase'
import { clearDemoDb } from '@/lib/demo-store'
import { WELCOME_SEEN_KEY } from '@/components/common/welcome-drawer'
import { signOut as signOutSupabase } from '@/features/auth/services/auth.service'
import { useAppLockStore } from '@/store/app-lock-store'
import type { AuthUser } from '@/features/auth/types'

const demoUser: AuthUser = {
  id: 'demo-owner',
  email: 'demo@jeevanam.app',
  name: 'Demo Owner',
  photoUrl: null,
  phone: null,
}

function mapSupabaseUser(user: {
  id: string
  email?: string
  phone?: string
  user_metadata: Record<string, unknown>
}): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    name: (user.user_metadata.name as string | undefined) ?? (user.user_metadata.full_name as string | undefined) ?? user.email ?? 'Owner',
    photoUrl: (user.user_metadata.avatar_url as string | undefined) ?? (user.user_metadata.picture as string | undefined) ?? null,
    // Google's OAuth scopes don't include phone number by default, so this is
    // usually null — falls back to Supabase's own verified `phone` (used when
    // phone-based auth is set up) or a phone_number claim if ever present.
    phone: user.phone || (user.user_metadata.phone_number as string | undefined) || null,
  }
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isDemoMode: boolean
  isLoading: boolean
  continueInDemoMode: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const demoFlag = localStorage.getItem(DEMO_MODE_KEY) === 'true'

    if (!isSupabaseConfigured) {
      if (demoFlag) {
        setIsDemoMode(true)
        setUser(demoUser)
      }
      setIsLoading(false)
      return
    }

    // Deliberately not calling getSession() up front — after an OAuth
    // redirect, the session isn't established yet (Supabase is still
    // exchanging the ?code=... in the URL for a real session), so a
    // getSession() call here can resolve with "no session" before that
    // finishes, incorrectly bouncing a successful sign-in back to /login.
    // onAuthStateChange's first callback is always 'INITIAL_SESSION',
    // fired only once that exchange (if any) has completed, so this is the
    // one call that's actually safe to gate isLoading on.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsDemoMode(false)
        setUser(mapSupabaseUser(session.user))
      } else if (localStorage.getItem(DEMO_MODE_KEY) === 'true') {
        setIsDemoMode(true)
        setUser(demoUser)
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const continueInDemoMode = useCallback(() => {
    localStorage.setItem(DEMO_MODE_KEY, 'true')
    setIsDemoMode(true)
    setUser(demoUser)
    // Demo mode is for quick exploration — never gate it behind a PIN.
    useAppLockStore.getState().disable()
  }, [])

  const logout = useCallback(async () => {
    // App Lock is tied to "this device, this session" — carrying a stale PIN
    // into the next login (demo or a different Google account) makes no
    // sense, so clear it on the way out. The next signed-in user can turn it
    // back on from Settings if they want it.
    useAppLockStore.getState().disable()

    if (isDemoMode) {
      localStorage.removeItem(DEMO_MODE_KEY)
      localStorage.removeItem(WELCOME_SEEN_KEY)
      clearDemoDb()
      queryClient.clear()
      setIsDemoMode(false)
      setUser(null)
      return
    }
    await signOutSupabase()
    queryClient.clear()
    setUser(null)
  }, [isDemoMode, queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isDemoMode,
      isLoading,
      continueInDemoMode,
      logout,
    }),
    [user, isDemoMode, isLoading, continueInDemoMode, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
