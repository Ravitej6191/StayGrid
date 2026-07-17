import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import QRCode from 'qrcode'
import pino from 'pino'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from 'baileys'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, 'auth_info')
const PORT = process.env.PORT || 4000
const QR_TTL_MS = 20_000 // WhatsApp rotates the QR roughly every 20s

const AUTH_TOKEN = process.env.WHATSAPP_SERVER_TOKEN
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

if (!AUTH_TOKEN) {
  console.error(
    'WHATSAPP_SERVER_TOKEN is not set. Refusing to start — anyone able to reach this port could hijack the ' +
      'WhatsApp session or send messages on your behalf. Set it in server/.env (see server/.env.example).',
  )
  process.exit(1)
}

const logger = pino({ level: 'silent' })

/** @type {{status: 'disconnected'|'qr'|'connecting'|'connected', qr: {dataUrl: string, expiresAt: number} | null, phoneNumber: string | null, connectedAt: string | null}} */
const state = {
  status: 'disconnected',
  qr: null,
  phoneNumber: null,
  connectedAt: null,
}

let sock = null
let starting = false

function resetState() {
  state.status = 'disconnected'
  state.qr = null
  state.phoneNumber = null
  state.connectedAt = null
}

async function startSocket() {
  if (starting) return
  starting = true
  try {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
      version,
      auth: authState,
      logger,
      printQRInTerminal: false,
      browser: ['StayGrid', 'Chrome', '1.0.0'],
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        state.status = 'qr'
        state.qr = {
          dataUrl: await QRCode.toDataURL(qr, { margin: 1, width: 320 }),
          expiresAt: Date.now() + QR_TTL_MS,
        }
      }

      if (connection === 'connecting') {
        state.status = state.qr ? state.status : 'connecting'
      }

      if (connection === 'open') {
        const jid = sock.user?.id ?? ''
        state.status = 'connected'
        state.qr = null
        state.phoneNumber = jid.split(':')[0].split('@')[0] || null
        state.connectedAt = new Date().toISOString()
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const loggedOut = statusCode === DisconnectReason.loggedOut

        if (loggedOut) {
          resetState()
          if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true })
          sock = null
          starting = false
          return
        }

        // Any other disconnect reason (network blip, restart required, etc.) -> reconnect automatically.
        state.status = 'connecting'
        state.qr = null
        starting = false
        void startSocket()
        return
      }
    })
  } finally {
    starting = false
  }
}

const app = express()
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
  }),
)
app.use(express.json())

// Every /api/whatsapp/* route requires a bearer token matching WHATSAPP_SERVER_TOKEN.
// Without this, anyone who can reach this port could hijack the WhatsApp session,
// disconnect it, or send arbitrary messages from the owner's real account.
app.use('/api/whatsapp', (req, res, next) => {
  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }
  next()
})

app.post('/api/whatsapp/connect', async (req, res) => {
  if (state.status === 'connected') return res.json({ ok: true, state })
  if (!sock) await startSocket()
  res.json({ ok: true, state })
})

app.get('/api/whatsapp/status', (_req, res) => {
  res.json({ ok: true, state })
})

app.post('/api/whatsapp/refresh-qr', async (_req, res) => {
  try {
    if (sock) {
      sock.ev.removeAllListeners('connection.update')
      sock.ev.removeAllListeners('creds.update')
      try {
        sock.end(undefined)
      } catch {
        // socket may already be closed
      }
      sock = null
    }
    state.status = 'disconnected'
    state.qr = null
    await startSocket()
    res.json({ ok: true, state })
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Failed to refresh QR' })
  }
})

app.post('/api/whatsapp/cancel', async (_req, res) => {
  if (sock && state.status !== 'connected') {
    sock.ev.removeAllListeners('connection.update')
    sock.ev.removeAllListeners('creds.update')
    try {
      sock.end(undefined)
    } catch {
      // socket may already be closed
    }
    sock = null
  }
  resetState()
  res.json({ ok: true, state })
})

app.post('/api/whatsapp/disconnect', async (_req, res) => {
  try {
    if (sock) {
      try {
        await sock.logout()
      } catch {
        // ignore — we clear local session regardless
      }
      sock.ev.removeAllListeners('connection.update')
      sock.ev.removeAllListeners('creds.update')
      sock = null
    }
    if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true })
    resetState()
    res.json({ ok: true, state })
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Failed to disconnect' })
  }
})

/** Normalizes a stored tenant number (often a bare 10-digit Indian mobile
 * number with no country code) into the full E.164-style digits WhatsApp
 * expects in a JID. Numbers that already look like they carry a country
 * code (11+ digits) are left untouched. */
function toFullNumber(rawNumber) {
  const digits = String(rawNumber).replace(/\D/g, '')
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`
  return digits
}

app.post('/api/whatsapp/send', async (req, res) => {
  const { to, message } = req.body ?? {}
  if (state.status !== 'connected' || !sock) {
    return res.status(409).json({ ok: false, error: 'WhatsApp is not connected' })
  }
  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'to and message are required' })
  }
  try {
    const fullNumber = toFullNumber(to)
    const [result] = await sock.onWhatsApp(fullNumber)
    if (!result?.exists) {
      return res.status(404).json({ ok: false, error: `${to} is not a WhatsApp number` })
    }
    await sock.sendMessage(result.jid, { text: message })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Failed to send message' })
  }
})

app.listen(PORT, () => {
  console.log(`StayGrid WhatsApp server listening on http://localhost:${PORT}`)
  // Resume an existing session on boot if one was persisted.
  if (fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0) {
    state.status = 'connecting'
    void startSocket()
  }
})
