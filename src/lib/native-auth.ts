import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

/** Handles the deep link Google/Supabase redirect to after native sign-in
 * (see android/app/src/main/AndroidManifest.xml's intent-filter and
 * signInWithGoogle's `skipBrowserRedirect` branch). Exchanges the `code`
 * for a session — auth-provider's onAuthStateChange listener picks up the
 * resulting session automatically, same as the web flow. */
export function initNativeAuthListener(): () => void {
  const listenerPromise = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    if (!url.startsWith('com.jeevanam.app://login-callback')) return

    void Browser.close().catch(() => {})

    const params = new URL(url).searchParams
    const code = params.get('code')
    const errorDescription = params.get('error_description') ?? params.get('error')

    if (errorDescription) {
      toast.error(errorDescription.replace(/\+/g, ' '))
      return
    }
    if (!code) return

    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) toast.error(error.message)
    })
  })

  return () => {
    void listenerPromise.then((listener) => listener.remove())
  }
}
