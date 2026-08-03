import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Download,
  Info,
  Loader2,
  RefreshCw,
  Share2,
  Smartphone,
  X,
} from 'lucide-react'
import whatsappLogo from '@/assets/whatsapp-logo.svg'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmSheet } from '@/components/common/confirm-sheet'
import { usePageTitle } from '@/hooks/use-page-title'
import { formatDateTime } from '@/utils/format'
import { useWhatsAppStatus } from '@/features/whatsapp/hooks/use-whatsapp-status'
import {
  cancelWhatsAppConnect,
  connectWhatsApp,
  disconnectWhatsApp,
  refreshWhatsAppQr,
} from '@/features/whatsapp/services/whatsapp.service'

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta?.match(/data:(.*);base64/)?.[1] ?? 'image/png'
  const binary = atob(base64 ?? '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function WhatsAppIntegrationPage() {
  const navigate = useNavigate()
  const onBack = useCallback(() => navigate(-1), [navigate])
  usePageTitle('WhatsApp Integration', onBack)
  const queryClient = useQueryClient()

  const [hasStarted, setHasStarted] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const { data, isLoading } = useWhatsAppStatus(true)

  useEffect(() => {
    if (data) setHasStarted(data.status !== 'disconnected')
  }, [data])

  useEffect(() => {
    if (data?.status !== 'qr') return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [data?.status])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] })

  const connectMutation = useMutation({
    mutationFn: connectWhatsApp,
    onSuccess: async () => {
      setHasStarted(true)
      await invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const refreshMutation = useMutation({
    mutationFn: refreshWhatsAppQr,
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  })

  const cancelMutation = useMutation({
    mutationFn: cancelWhatsAppConnect,
    onSuccess: async () => {
      setHasStarted(false)
      await invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const disconnectMutation = useMutation({
    mutationFn: disconnectWhatsApp,
    onSuccess: async () => {
      setHasStarted(false)
      setDisconnectOpen(false)
      await invalidate()
      toast.success('WhatsApp disconnected')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const status = data?.status ?? 'disconnected'
  const qr = data?.qr ?? null

  const msRemaining = useMemo(() => (qr ? qr.expiresAt - now : 0), [qr, now])
  const countdownLabel = formatCountdown(msRemaining)

  const handleDownload = () => {
    if (!qr) return
    const url = URL.createObjectURL(dataUrlToBlob(qr.dataUrl))
    const a = document.createElement('a')
    a.href = url
    a.download = 'staygrid-whatsapp-qr.png'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (!qr) return
    try {
      if (navigator.share && navigator.canShare) {
        const file = new File([dataUrlToBlob(qr.dataUrl)], 'staygrid-whatsapp-qr.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'StayGrid WhatsApp QR' })
          return
        }
      }
      handleDownload()
    } catch {
      // user cancelled the share sheet — no-op
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardContent className="space-y-4">
          {isLoading && !data ? (
            <Skeleton className="h-48 w-full" />
          ) : status === 'connected' ? (
            <ConnectedView
              phoneNumber={data?.phoneNumber ?? null}
              connectedAt={data?.connectedAt ?? null}
              onDisconnect={() => setDisconnectOpen(true)}
            />
          ) : status === 'connecting' ? (
            <ConnectingView />
          ) : status === 'qr' && qr ? (
            <QrView
              qr={qr}
              countdownLabel={countdownLabel}
              isExpired={msRemaining <= 0}
              onDownload={handleDownload}
              onShare={handleShare}
              onRefresh={() => refreshMutation.mutate()}
              onCancel={() => cancelMutation.mutate()}
              isRefreshing={refreshMutation.isPending}
              isCancelling={cancelMutation.isPending}
            />
          ) : (
            <DisconnectedView
              onConnect={() => connectMutation.mutate()}
              isPending={connectMutation.isPending || hasStarted}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="flex items-start gap-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          <p>
            If you're using StayGrid on the same phone as WhatsApp, download or share this QR to another device,
            then open WhatsApp → Linked Devices → Link a Device and scan the QR.
          </p>
        </CardContent>
      </Card>

      <ConfirmSheet
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="Disconnect WhatsApp?"
        description="Broadcasts will stop sending until you reconnect and scan a new QR code."
        confirmLabel="Disconnect"
        isPending={disconnectMutation.isPending}
        onConfirm={() => disconnectMutation.mutate()}
      />
    </div>
  )
}

function DisconnectedView({ onConnect, isPending }: { onConnect: () => void; isPending: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted p-2.5">
        <img src={whatsappLogo} alt="" className="size-full" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Connect your WhatsApp</p>
        <p className="text-sm text-muted-foreground">
          Link your own WhatsApp account to send announcements, reminders, and notifications to tenants for free.
        </p>
      </div>
      <Button className="w-full" onClick={onConnect} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Connect WhatsApp
      </Button>
    </div>
  )
}

function ConnectingView() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-foreground">Connecting…</p>
      <p className="text-xs text-muted-foreground">Finishing up after your scan. This only takes a moment.</p>
    </div>
  )
}

interface QrViewProps {
  qr: { dataUrl: string; expiresAt: number }
  countdownLabel: string
  isExpired: boolean
  onDownload: () => void
  onShare: () => void
  onRefresh: () => void
  onCancel: () => void
  isRefreshing: boolean
  isCancelling: boolean
}

function QrView({
  qr,
  countdownLabel,
  isExpired,
  onDownload,
  onShare,
  onRefresh,
  onCancel,
  isRefreshing,
  isCancelling,
}: QrViewProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div className="relative flex size-56 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-white p-3">
        <img src={qr.dataUrl} alt="WhatsApp QR code" className="size-full object-contain" />
        {isExpired ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Scan with WhatsApp</p>
        <p className="font-numeric text-xs text-muted-foreground">
          {isExpired ? 'Refreshing QR…' : `Expires in ${countdownLabel}`}
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="size-3.5" />
          Download QR
        </Button>
        <Button variant="outline" size="sm" onClick={onShare}>
          <Share2 className="size-3.5" />
          Share QR
        </Button>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Generate New QR
        </Button>
        <Button variant="outline" size="sm" className="text-danger hover:text-danger" onClick={onCancel} disabled={isCancelling}>
          <X className="size-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

function ConnectedView({
  phoneNumber,
  connectedAt,
  onDisconnect,
}: {
  phoneNumber: string | null
  connectedAt: string | null
  onDisconnect: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="size-7" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">WhatsApp Connected</p>
        <p className="text-sm text-muted-foreground">Broadcasts and reminders will send from your WhatsApp account.</p>
      </div>

      <div className="w-full space-y-2.5 rounded-lg bg-muted/50 p-3 text-left text-sm">
        <div className="flex items-center gap-2.5">
          <Smartphone className="size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Connected number</p>
            <p className="font-medium text-foreground">{phoneNumber ? `+${phoneNumber}` : 'Unknown'}</p>
          </div>
        </div>
        {connectedAt ? (
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Connected since</p>
              <p className="font-medium text-foreground">{formatDateTime(connectedAt)}</p>
            </div>
          </div>
        ) : null}
      </div>

      <Button variant="outline" className="w-full text-danger hover:text-danger" onClick={onDisconnect}>
        Disconnect
      </Button>
    </div>
  )
}
