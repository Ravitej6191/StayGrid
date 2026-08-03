const STORAGE_KEY = 'staygrid.authError'

/**
 * Supabase reports OAuth failures (e.g. a bad Google client secret) by
 * appending `?error=...&error_description=...` to the redirect URL. Left
 * alone, the app's own client-side routing (`/` → `/dashboard` → `/login`)
 * silently wipes that query string via `history.replace` before a user
 * ever sees it — so a real, diagnosable error just looks like a silent
 * bounce back to login.
 *
 * Called once, synchronously, before React/React Router ever run, so it
 * captures the error and scrubs the URL before any navigation has a
 * chance to clear it first.
 */
export function captureAuthErrorFromUrl(): void {
  const params = new URLSearchParams(window.location.search)
  const description = params.get('error_description')
  const error = params.get('error')
  if (!description && !error) return

  sessionStorage.setItem(STORAGE_KEY, (description ?? error ?? 'Sign-in failed').replace(/\+/g, ' '))

  params.delete('error')
  params.delete('error_code')
  params.delete('error_description')
  const query = params.toString()
  const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}`
  window.history.replaceState(null, '', cleanUrl)
}

export function consumeCapturedAuthError(): string | null {
  const message = sessionStorage.getItem(STORAGE_KEY)
  if (message) sessionStorage.removeItem(STORAGE_KEY)
  return message
}
