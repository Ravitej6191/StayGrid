const PLACEHOLDER_URL = 'https://your-project.supabase.co'
const PLACEHOLDER_KEY = 'your-anon-key'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

/**
 * True only when real Supabase credentials are present. When false, every
 * feature service falls back to its in-memory mock so the app stays fully
 * navigable without a live backend.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== PLACEHOLDER_URL &&
    supabaseAnonKey !== PLACEHOLDER_KEY,
)

export const env = {
  supabaseUrl: supabaseUrl ?? PLACEHOLDER_URL,
  supabaseAnonKey: supabaseAnonKey ?? PLACEHOLDER_KEY,
  whatsappServerUrl: (import.meta.env.VITE_WHATSAPP_SERVER_URL as string | undefined) ?? 'http://localhost:4000',
  whatsappServerToken: import.meta.env.VITE_WHATSAPP_SERVER_TOKEN as string | undefined,
}

export const DEMO_MODE_KEY = 'staygrid.demoMode'

/**
 * True whenever THIS session should use the local demo store — either
 * because no real Supabase project is configured at all, or because a real
 * project IS configured but the signed-in user explicitly chose "Continue
 * in Demo Mode". `isSupabaseConfigured` alone only answers "could this app
 * talk to a real backend", not "should this particular session" — every
 * service must gate on this, not on `isSupabaseConfigured` directly, or
 * demo-mode users get silently routed to the real backend once real
 * credentials exist.
 */
export function isDemoSession(): boolean {
  if (!isSupabaseConfigured) return true
  return localStorage.getItem(DEMO_MODE_KEY) === 'true'
}
