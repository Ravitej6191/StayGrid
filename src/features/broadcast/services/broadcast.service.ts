import { sendBroadcast as demoLogBroadcast } from '@/lib/demo-store'
import { sendWhatsAppMessage } from '@/features/whatsapp/services/whatsapp.service'

export interface SendBroadcastInput {
  message: string
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
    uniqueRecipients.map((phone) => sendWhatsAppMessage(phone, input.message)),
  )

  const failed = results.filter((r) => !r.ok).map((r) => ({ phone: r.to, error: r.error }))
  const deliveredCount = uniqueRecipients.length - failed.length

  demoLogBroadcast({
    message: input.message,
    audience: input.audience,
    recipientCount: uniqueRecipients.length,
    deliveredCount,
  })

  return { recipientCount: uniqueRecipients.length, deliveredCount, failed }
}
