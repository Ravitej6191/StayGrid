import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/hooks/use-page-title'
import { APP_VERSION } from '@/constants/app'

export function PrivacyPolicyPage() {
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  usePageTitle('Privacy Policy', onBack)

  return (
    <div className="space-y-4 pb-8 text-sm text-muted-foreground">
      <p className="text-xs">Last updated: version {APP_VERSION} · This is placeholder text for development.</p>

      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">Data we store</h2>
        <p>
          StayGrid stores the building, tenant, payment, and expense records you enter so you can manage your
          property. In demo mode, everything stays on this device. When connected to a live account, records are
          stored securely and are only accessible to your account.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">WhatsApp broadcasting</h2>
        <p>
          If you connect WhatsApp, messages you send through Broadcast are delivered directly from your own linked
          WhatsApp account. StayGrid does not read or store your other WhatsApp conversations.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">Your control</h2>
        <p>
          You can clear all app data or delete your account at any time from Settings. This permanently removes
          your building, tenants, payments, and expense records.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">Contact</h2>
        <p>Questions about this policy can be directed to the app owner.</p>
      </section>
    </div>
  )
}
