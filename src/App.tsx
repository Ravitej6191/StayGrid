import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/providers/theme-provider'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider, useAuth } from '@/providers/auth-provider'
import { applyThemeColor, getStoredThemeColor } from '@/constants/theme-colors'
import { router } from '@/app/router'

function AppGate() {
  const { isLoading } = useAuth()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    applyThemeColor(getStoredThemeColor())
  }, [resolvedTheme])

  if (isLoading) {
    return <div className="min-h-svh bg-background" />
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
