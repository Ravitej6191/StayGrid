import { env } from '@/config/env'
import type { WhatsAppState } from '../types'

const BASE_URL = env.whatsappServerUrl

function authHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (env.whatsappServerToken) headers.Authorization = `Bearer ${env.whatsappServerToken}`
  return headers
}

async function request(path: string, init?: RequestInit): Promise<WhatsAppState> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      ...init,
    })
  } catch {
    throw new Error('Could not reach the WhatsApp server. Make sure it is running.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok || !body?.ok) {
    throw new Error(body?.error ?? 'WhatsApp server request failed.')
  }
  return body.state as WhatsAppState
}

export async function connectWhatsApp(): Promise<WhatsAppState> {
  return request('/api/whatsapp/connect')
}

export async function getWhatsAppStatus(): Promise<WhatsAppState> {
  try {
    const response = await fetch(`${BASE_URL}/api/whatsapp/status`, { headers: authHeaders() })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body?.ok) throw new Error(body?.error ?? 'Could not fetch WhatsApp status.')
    return body.state as WhatsAppState
  } catch (error) {
    if (error instanceof Error && error.message.includes('WhatsApp')) throw error
    throw new Error('Could not reach the WhatsApp server. Make sure it is running.')
  }
}

export async function refreshWhatsAppQr(): Promise<WhatsAppState> {
  return request('/api/whatsapp/refresh-qr')
}

export async function cancelWhatsAppConnect(): Promise<WhatsAppState> {
  return request('/api/whatsapp/cancel')
}

export async function disconnectWhatsApp(): Promise<WhatsAppState> {
  return request('/api/whatsapp/disconnect')
}

export interface SendWhatsAppMessageResult {
  to: string
  ok: boolean
  error?: string
}

/** Sends a text (optionally with an image) to a single phone number over the
 * connected WhatsApp session. Never throws — failures are reported
 * per-recipient so a broadcast to many tenants can report partial success. */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  imageUrl?: string | null,
): Promise<SendWhatsAppMessageResult> {
  try {
    const response = await fetch(`${BASE_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ to, message, imageUrl: imageUrl ?? undefined }),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body?.ok) {
      return { to, ok: false, error: body?.error ?? 'Failed to send' }
    }
    return { to, ok: true }
  } catch {
    return { to, ok: false, error: 'Could not reach the WhatsApp server' }
  }
}
