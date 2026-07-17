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
}
