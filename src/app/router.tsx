import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/layouts/app-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { ProtectedRoute } from './protected-route'
import { OnboardingGate } from './onboarding-gate'

const LoginPage = lazy(() => import('@/pages/login-page').then((m) => ({ default: m.LoginPage })))
const OnboardingPage = lazy(() => import('@/pages/onboarding-page').then((m) => ({ default: m.OnboardingPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })))
const BuildingPage = lazy(() => import('@/pages/building-page').then((m) => ({ default: m.BuildingPage })))
const TenantsPage = lazy(() => import('@/pages/tenants-page').then((m) => ({ default: m.TenantsPage })))
const TenantDetailPage = lazy(() =>
  import('@/pages/tenant-detail-page').then((m) => ({ default: m.TenantDetailPage })),
)
const AddTenantPage = lazy(() => import('@/pages/add-tenant-page').then((m) => ({ default: m.AddTenantPage })))
const RecordPaymentPage = lazy(() =>
  import('@/pages/record-payment-page').then((m) => ({ default: m.RecordPaymentPage })),
)
const ExpensesPage = lazy(() => import('@/pages/expenses-page').then((m) => ({ default: m.ExpensesPage })))
const AddExpensePage = lazy(() => import('@/pages/add-expense-page').then((m) => ({ default: m.AddExpensePage })))
const BroadcastPage = lazy(() => import('@/pages/broadcast-page').then((m) => ({ default: m.BroadcastPage })))
const SettingsPage = lazy(() => import('@/pages/settings-page').then((m) => ({ default: m.SettingsPage })))
const PastTenantsPage = lazy(() =>
  import('@/pages/past-tenants-page').then((m) => ({ default: m.PastTenantsPage })),
)
const EditProfilePage = lazy(() =>
  import('@/pages/edit-profile-page').then((m) => ({ default: m.EditProfilePage })),
)
const NotificationsPage = lazy(() =>
  import('@/pages/notifications-page').then((m) => ({ default: m.NotificationsPage })),
)
const WhatsAppIntegrationPage = lazy(() =>
  import('@/pages/whatsapp-integration-page').then((m) => ({ default: m.WhatsAppIntegrationPage })),
)
const PrivacyPolicyPage = lazy(() =>
  import('@/pages/privacy-policy-page').then((m) => ({ default: m.PrivacyPolicyPage })),
)
const NotFoundPage = lazy(() => import('@/pages/not-found-page').then((m) => ({ default: m.NotFoundPage })))

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: '/login', element: withSuspense(<LoginPage />) }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/onboarding', element: withSuspense(<OnboardingPage />) },
      {
        element: <OnboardingGate />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <Navigate to="/dashboard" replace /> },
              { path: '/dashboard', element: withSuspense(<DashboardPage />) },
              { path: '/building', element: withSuspense(<BuildingPage />) },
              { path: '/tenants', element: withSuspense(<TenantsPage />) },
              { path: '/tenants/new', element: withSuspense(<AddTenantPage />) },
              { path: '/tenants/record-payment', element: withSuspense(<RecordPaymentPage />) },
              { path: '/tenants/:id', element: withSuspense(<TenantDetailPage />) },
              { path: '/tenants/:id/edit', element: withSuspense(<AddTenantPage />) },
              { path: '/expenses', element: withSuspense(<ExpensesPage />) },
              { path: '/expenses/new', element: withSuspense(<AddExpensePage />) },
              { path: '/expenses/:id/edit', element: withSuspense(<AddExpensePage />) },
              { path: '/broadcast', element: withSuspense(<BroadcastPage />) },
              { path: '/settings', element: withSuspense(<SettingsPage />) },
              { path: '/settings/past-tenants', element: withSuspense(<PastTenantsPage />) },
              { path: '/settings/edit-profile', element: withSuspense(<EditProfilePage />) },
              { path: '/settings/whatsapp', element: withSuspense(<WhatsAppIntegrationPage />) },
              { path: '/settings/privacy-policy', element: withSuspense(<PrivacyPolicyPage />) },
              { path: '/notifications', element: withSuspense(<NotificationsPage />) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: withSuspense(<NotFoundPage />) },
])
