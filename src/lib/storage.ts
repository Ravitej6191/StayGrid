import { isDemoSession } from '@/config/env'
import { supabase } from './supabase'

const BUCKET = 'tenant-uploads'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error instanceof Error ? reader.error : new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Uploads a tenant-related file (photo, deposit screenshot) and returns a
 * URL to store on the record. In demo mode (no live Supabase project) this
 * falls back to a base64 data URL so the feature stays fully demoable
 * without a bucket. Against a real backend it uploads to Supabase Storage
 * instead of writing large base64 blobs into `select('*')` rows.
 */
export async function uploadTenantFile(file: File, folder: string): Promise<string> {
  if (isDemoSession()) {
    return fileToDataUrl(file)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
