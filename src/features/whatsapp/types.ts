export type WhatsAppConnectionStatus = 'disconnected' | 'qr' | 'connecting' | 'connected'

export interface WhatsAppQr {
  dataUrl: string
  expiresAt: number
}

export interface WhatsAppState {
  status: WhatsAppConnectionStatus
  qr: WhatsAppQr | null
  phoneNumber: string | null
  connectedAt: string | null
}
