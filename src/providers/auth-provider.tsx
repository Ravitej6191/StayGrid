import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isSupabaseConfigured } from '@/config/env'
import { supabase } from '@/lib/supabase'
import { clearDemoDb } from '@/lib/demo-store'
import { WELCOME_SEEN_KEY } from '@/components/common/welcome-drawer'
import { signOut as signOutSupabase } from '@/features/auth/services/auth.service'
import type { AuthUser } from '@/features/auth/types'

const DEMO_MODE_KEY = 'staygrid.demoMode'

const demoUser: AuthUser = {
  id: 'demo-owner',
  email: 'demo@staygrid.app',
  name: 'Demo Owner',
  photoUrl: null,
}

function mapSupabaseUser(user: { id: string; email?: string; user_metadata: Record<string, unknown> }): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    name: (user.user_metadata.name as string | undefined) ?? (user.user_metadata.full_name as string | undefined) ?? user.email ?? 'Owner',
    photoUrl: (user.user_metadata.avatar_url as string | undefined) ?? (user.user_metadata.picture as string | undefined) ?? null,
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
    let unsubscribe: (() => void) | undefined

    async function init() {
      const demoFlag = localStorage.getItem(DEMO_MODE_KEY) === 'true'

      if (isSupabaseConfigured) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(mapSupabaseUser(session.user))
        } else if (demoFlag) {
          setIsDemoMode(true)
          setUser(demoUser)
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setIsDemoMode(false)
            setUser(mapSupabaseUser(session.user))
          } else if (localStorage.getItem(DEMO_MODE_KEY) !== 'true') {
            setUser(null)
          }
        })
        unsubscribe = () => sub.subscription.unsubscribe()
      } else if (demoFlag) {
        setIsDemoMode(true)
        setUser(demoUser)
      }

      setIsLoading(false)
    }

    void init()
    return () => unsubscribe?.()
  }, [])

  const continueInDemoMode = () => {
    localStorage.setItem(DEMO_MODE_KEY, 'true')
    setIsDemoMode(true)
    setUser(demoUser)
  }

  const logout = async () => {
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
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isDemoMode,
      isLoading,
      continueInDemoMode,
      logout,
    }),
    [user, isDemoMode, isLoading],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
