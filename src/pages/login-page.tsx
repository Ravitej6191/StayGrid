import { Navigate, useLocation } from 'react-router-dom'
import { LoginForm } from '@/features/auth/components/login-form'
import { useAuth } from '@/providers/auth-provider'

export function LoginPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  return <LoginForm />
}
