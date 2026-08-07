import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '@/lib/supabase'

/** Custom scheme the Android app registers an intent-filter for (see
 * android/app/src/main/AndroidManifest.xml) — Google/Supabase redirect here
 * instead of a web URL once the OAuth flow finishes. */
const NATIVE_REDIRECT_URL = 'com.jeevanam.app://login-callback'

export async function signInWithGoogle(redirectPath = '/dashboard') {
  if (Capacitor.isNativePlatform()) {
    // The WebView can't receive a browser redirect, so open the OAuth URL in
    // the system browser instead (skipBrowserRedirect keeps supabase-js from
    // trying to navigate the WebView itself) and let the native deep-link
    // listener in native-auth.ts pick up the redirect back into the app.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: NATIVE_REDIRECT_URL, skipBrowserRedirect: true },
    })
    if (error) throw error
    if (data.url) await Browser.open({ url: data.url })
    return
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${redirectPath}` },
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
