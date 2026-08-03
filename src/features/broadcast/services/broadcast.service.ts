import { isDemoSession } from '@/config/env'
import { supabase } from '@/lib/supabase'
import { sendBroadcast as demoLogBroadcast } from '@/lib/demo-store'
import { sendWhatsAppMessage } from '@/features/whatsapp/services/whatsapp.service'
import { pushSupabaseNotification } from '@/features/notifications/services/notifications.service'

export interface SendBroadcastInput {
  message: string
  imageUrl: string | null
  audience: string
  recipients: string[]
}

export interface SendBroadcastResult {
  recipientCount: number
  deliveredCount: number
  failed: { phone: string; error?: string }[]
}

/** Sends the message to every recipient phone number over the owner's own
 * connected WhatsApp session, then logs the broadcast locally (recipient
 * counts, timestamp) regardless of delivery outcome so the history and
 * notification always reflect what was attempted. */
export async function sendBroadcast(input: SendBroadcastInput): Promise<SendBroadcastResult> {
  const uniqueRecipients = Array.from(new Set(input.recipients.filter(Boolean)))

  const results = await Promise.all(
    uniqueRecipients.map((phone) => sendWhatsAppMessage(phone, input.message, input.imageUrl)),
  )

  const failed = results.filter((r) => !r.ok).map((r) => ({ phone: r.to, error: r.error }))
  const deliveredCount = uniqueRecipients.length - failed.length
  const recipientCount = uniqueRecipients.length

  if (isDemoSession()) {
    demoLogBroadcast({
      message: input.message,
      imageUrl: input.imageUrl,
      audience: input.audience,
      recipientCount,
      deliveredCount,
    })
    return { recipientCount, deliveredCount, failed }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: buildingRow, error: buildingError } = await supabase
    .from('building')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (buildingError) throw buildingError

  const { error: insertError } = await supabase.from('broadcasts').insert({
    building_id: buildingRow.id,
    message: input.message,
    image_url: input.imageUrl,
    audience: input.audience,
    recipient_count: recipientCount,
    delivered_count: deliveredCount,
  })
  if (insertError) throw insertError

  await pushSupabaseNotification(
    buildingRow.id,
    'broadcast',
    'Broadcast sent',
    `Delivered to ${deliveredCount}/${recipientCount} tenant${recipientCount === 1 ? '' : 's'} (${input.audience}).`,
  )

  return { recipientCount, deliveredCount, failed }
}
